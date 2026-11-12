"use server";

import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";
import { failed, type Result } from "@/lib/result";
import { MANUAL, UNDECIDED, type WaitlistEntry } from "@/lib/waitlist";
import { passwordLink } from "@/lib/app/accounts";
import {
  CAPACITY,
  listUnits,
  matchBuilding,
  ROOM_TYPE_LABELS,
  roomTypeFromLabel,
  unitNumber,
  type AppBuilding,
  type Unit,
} from "@/lib/app/units";
import { mailConfigured, sendMail } from "@/lib/app/mailgun";
import {
  acceptedParent,
  acceptedStudent,
  declinedParent,
  declinedStudent,
  interviewParent,
  interviewStudent,
  newPasswordLink,
  offeredParent,
  offeredStudent,
  teamNotice,
  type Offer,
} from "@/lib/app/emails";

/* The waitlist's controls. Everything happens in the Volley app's project
   (lib/appSupabase.ts), with its service role, once the caller is known to
   be an admin here.

   - A mark without an email: new, contacted, closed (setWaitlistStatus).
   - Interview: emails them and their parent that they're shortlisted and
     Elaine will set a time, and tells the team (inviteToInterview).
   - Accept: while the Volley app isn't live, emails them and their parent
     that they have a place (the building and unit type picked here) and
     Elaine will be in touch, and tells the team (acceptOffer). Once it is
     (VOLLEY_APP_ACCOUNTS=on), the Volley app's admin's own Accept instead:
     into a unit, with their login, profile and set-password link
     (acceptApplicant, kept in step with
     volley-app-admin-panel/src/app/(admin)/waitlist/actions.ts).
   - Decline: the sorry emails (declineApplicant).
   Each email to the student can carry a line of the admin's own, and is
   shown before it goes (previewEmail). */

// Whether Accept makes their Volley account: only once the app is live.
export async function accountsOn() {
  return process.env.VOLLEY_APP_ACCOUNTS === "on";
}

/* Tells the team, if there's an address for it. Best effort: the student
   has already been told, so a failure here is only a warning. */
async function tellTeam(...args: Parameters<typeof teamNotice>) {
  const to = process.env.WAITLIST_NOTIFY_EMAIL;
  if (!to) return "";
  return sendMail({ to, ...teamNotice(...args) }).then(
    () => "",
    (err: Error) => ` The note to the team (${to}) didn't send: ${err.message}`,
  );
}

// The parent's email, if they gave one: its failure only a warning.
const tellParent = (to: string, mail: { subject: string; html: string; text: string }) =>
  to.trim()
    ? sendMail({ to, ...mail }).then(
        () => "",
        (err: Error) => ` The email to their parent (${to}) didn't send: ${err.message}`,
      )
    : Promise.resolve("");

// What's missing before Accept / Decline can work, as settings to add.
function setupProblem(needs: { accounts?: boolean }) {
  const missing: string[] = [];
  if (!appSupabase()) missing.push("VOLLEY_APP_SUPABASE_URL and VOLLEY_APP_SUPABASE_SERVICE_ROLE_KEY");
  if (!mailConfigured()) missing.push("MAILGUN_API_KEY and MAILGUN_DOMAIN");
  if (needs.accounts && !process.env.RESIDENT_PORTAL_URL) missing.push("RESIDENT_PORTAL_URL");
  return missing.length ? `Not set up yet: add ${missing.join(", ")} to .env.local, then restart the admin.` : null;
}

async function loadEntry(id: string) {
  await requireAdmin();
  const db = appSupabase();
  if (!db) throw new Error("The Volley app isn't connected.");
  const { data, error } = await db.from("waitlist").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return { db, entry: data as WaitlistEntry | null };
}

export async function setWaitlistStatus(id: string, status: string): Promise<Result> {
  if (!MANUAL.includes(status)) return { ok: false, message: "Use Interview, Accept or Decline for that: they send an email." };
  try {
    const { db, entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (!UNDECIDED.includes(entry.status) && entry.status !== "closed")
      return { ok: false, message: "This person has already been accepted or declined." };
    const { error } = await db.from("waitlist").update({ status }).eq("id", id);
    if (error) throw error;
    return { ok: true, message: "Status updated." };
  } catch (err) {
    return failed(err);
  }
}

/* ---- Accept --------------------------------------------------------------- */

export type PlacementOptions =
  | { ok: false; message: string }
  | {
      ok: true;
      buildings: AppBuilding[];
      units: Unit[];
      buildingId: string | null; // the building they asked for, if it matched
      roomType: string | null; // the unit type they asked for
    };

// For the unit picker: every unit, and which building and type they asked for.
export async function getPlacementOptions(id: string): Promise<PlacementOptions> {
  const problem = setupProblem({ accounts: true });
  if (problem) return { ok: false, message: problem };
  try {
    const { entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    const { buildings, units } = await listUnits();
    return {
      ok: true,
      buildings,
      units,
      buildingId: matchBuilding(entry.house, buildings)?.id ?? null,
      roomType: roomTypeFromLabel(entry.unit),
    };
  } catch (err) {
    return failed(err) as { ok: false; message: string };
  }
}

/* Accepts someone into `apartmentId`: creates their login and resident
   profile, emails them (with the set-password link at the bottom) and
   their parent, then marks them accepted with the unit.

   Safe to run again after a failure: the login is reused, the profile
   upserted, and nothing is marked accepted until the student's email has
   gone. */
export async function acceptApplicant(id: string, apartmentId: string): Promise<Result> {
  const problem = setupProblem({ accounts: true });
  if (problem) return { ok: false, message: problem };

  try {
    const { db, entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (!UNDECIDED.includes(entry.status))
      return { ok: false, message: "This person has already been accepted or declined." };

    const email = entry.email.trim().toLowerCase();
    const { data: unit, error: unitError } = await db
      .from("apartments")
      .select("id, building_id, unit_code, room_type, buildings ( name )")
      .eq("id", apartmentId)
      .maybeSingle();
    if (unitError) throw unitError;
    if (!unit) return { ok: false, message: "That unit doesn't exist any more. Pick another." };

    // Full means as many residents as bedrooms, not counting this person
    // (a retry, or a returning resident moving units).
    const { data: residents, error: countError } = await db
      .from("profiles")
      .select("id, email")
      .eq("apartment_id", apartmentId)
      .eq("is_driver", false)
      .eq("is_admin", false);
    if (countError) throw countError;
    const others = (residents ?? []).filter((r) => r.email?.toLowerCase() !== email);
    if (others.length >= (CAPACITY[unit.room_type] ?? 1))
      return { ok: false, message: `Unit ${unitNumber(unit.unit_code)} is full now. Pick another.` };

    const { userId, created, link } = await passwordLink(email);

    const { error: profileError } = await db.from("profiles").upsert({
      id: userId,
      building_id: unit.building_id,
      apartment_id: unit.id,
      first_name: entry.name.trim(),
      last_name: entry.surname.trim(),
      email,
      phone: entry.phone.trim() || null,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      // Don't leave a login with no profile behind: the app can't use it.
      if (created) await db.auth.admin.deleteUser(userId);
      throw profileError;
    }

    const building = (unit.buildings as unknown as { name: string } | null)?.name ?? entry.house;
    const place = {
      building,
      unit: unitNumber(unit.unit_code),
      roomType: ROOM_TYPE_LABELS[unit.room_type] ?? unit.room_type,
    };

    try {
      await sendMail({ to: entry.email, ...acceptedStudent(entry.name, place, link) });
    } catch (err) {
      return {
        ok: false,
        message: `Their account is ready, but the email to ${entry.email} didn't send (${(err as Error).message}). Press Accept again to retry: it won't make a second account.`,
      };
    }
    const parentWarning = await sendMail({
      to: entry.parent_email,
      ...acceptedParent(entry.parent_name, entry.name, place),
    }).then(
      () => "",
      (err: Error) => ` The email to their parent (${entry.parent_email}) didn't send: ${err.message}`,
    );

    const { error } = await db
      .from("waitlist")
      .update({ status: "accepted", decided_at: new Date().toISOString(), apartment_id: unit.id })
      .eq("id", id);
    if (error) throw error;

    return {
      // The student is done; a failed parent email is only a warning.
      ok: true,
      message: `Placed in ${building}, unit ${place.unit}, and emailed with their set-password link.${parentWarning}`,
    };
  } catch (err) {
    return failed(err);
  }
}

// A new set-password link, for an accepted student whose first one expired.
export async function resendPasswordLink(id: string): Promise<Result> {
  const problem = setupProblem({ accounts: true });
  if (problem) return { ok: false, message: problem };
  try {
    const { entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (entry.status !== "accepted") return { ok: false, message: "Only accepted people have an account." };
    const { link } = await passwordLink(entry.email.trim().toLowerCase());
    await sendMail({ to: entry.email, ...newPasswordLink(entry.name, link) });
    return { ok: true, message: `A new link is on its way to ${entry.email}.` };
  } catch (err) {
    return failed(err);
  }
}

/* ---- Decline -------------------------------------------------------------- */

// Sends the sorry emails (student first; it must go), then marks them declined.
export async function declineApplicant(id: string, note = ""): Promise<Result> {
  const problem = setupProblem({});
  if (problem) return { ok: false, message: problem };
  try {
    const { db, entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (!UNDECIDED.includes(entry.status))
      return { ok: false, message: "This person has already been accepted or declined." };

    await sendMail({ to: entry.email, ...declinedStudent(entry.name, note) });
    const parentWarning = await tellParent(entry.parent_email, declinedParent(entry.parent_name, entry.name));

    const { error } = await db
      .from("waitlist")
      .update({ status: "declined", decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { ok: true, message: `${entry.name} has been sent the sorry email.${parentWarning}` };
  } catch (err) {
    return failed(err);
  }
}

/* ---- Interview ------------------------------------------------------------ */

/* Invites someone to an interview for `building`: emails them (their line
   `note` in it) and their parent, tells the team, then marks them
   "Interview". Nothing's marked until the student's email has gone. */
export async function inviteToInterview(id: string, building: string, note = ""): Promise<Result> {
  const problem = setupProblem({});
  if (problem) return { ok: false, message: problem };
  if (!building.trim()) return { ok: false, message: "Pick the building the interview is for." };
  try {
    const { db, entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (!UNDECIDED.includes(entry.status))
      return { ok: false, message: "This person has already been accepted or declined." };

    await sendMail({ to: entry.email, ...interviewStudent(entry.name, building, note) });
    const warnings =
      (await tellParent(entry.parent_email, interviewParent(entry.parent_name, entry.name, building))) +
      (await tellTeam("interview", entry, `Volley ${building}`));

    const { error } = await db.from("waitlist").update({ status: "interview" }).eq("id", id);
    if (error) {
      if (/check constraint/i.test(error.message))
        return {
          ok: false,
          message: `${entry.name} has been emailed, but couldn't be marked "Interview": the Volley app's database needs a one-off update (Volley-App/supabase/migrations/026_waitlist_interview.sql).`,
        };
      throw error;
    }
    return { ok: true, message: `${entry.name} has been invited to an interview.${warnings}` };
  } catch (err) {
    return failed(err);
  }
}

/* ---- Accept, while the app isn't live ------------------------------------- */

/* Accepts someone for `offer` (a building and unit type): emails them
   (their line `note` in it) and their parent that they have a place and
   Elaine will be in touch, tells the team, then marks them accepted. No
   account is made: there's no app yet. */
export async function acceptOffer(id: string, offer: Offer, note = ""): Promise<Result> {
  const problem = setupProblem({});
  if (problem) return { ok: false, message: problem };
  if (!offer.building.trim() || !offer.roomType.trim())
    return { ok: false, message: "Pick the building and the unit type." };
  try {
    const { db, entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    if (!UNDECIDED.includes(entry.status))
      return { ok: false, message: "This person has already been accepted or declined." };

    await sendMail({ to: entry.email, ...offeredStudent(entry.name, offer, note) });
    const warnings =
      (await tellParent(entry.parent_email, offeredParent(entry.parent_name, entry.name, offer))) +
      (await tellTeam("accepted", entry, `a ${offer.roomType} at Volley ${offer.building}`));

    const { error } = await db
      .from("waitlist")
      .update({ status: "accepted", decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return {
      ok: true,
      message: `${entry.name} has been accepted for a ${offer.roomType} at Volley ${offer.building}, and emailed.${warnings}`,
    };
  } catch (err) {
    return failed(err);
  }
}

/* ---- Previews ------------------------------------------------------------- */

export type EmailKind = "interview" | "accept" | "decline";

/* The email the student would get, as text, for the confirm window to
   show before anything goes. */
export async function previewEmail(
  id: string,
  kind: EmailKind,
  options: { building?: string; roomType?: string; note?: string },
): Promise<{ ok: true; to: string; subject: string; text: string } | { ok: false; message: string }> {
  try {
    const { entry } = await loadEntry(id);
    if (!entry) return { ok: false, message: "Application not found." };
    const note = options.note ?? "";
    const mail =
      kind === "interview"
        ? interviewStudent(entry.name, options.building || entry.house, note)
        : kind === "accept"
          ? offeredStudent(entry.name, { building: options.building || entry.house, roomType: options.roomType || entry.unit }, note)
          : declinedStudent(entry.name, note);
    return { ok: true, to: entry.email, subject: mail.subject, text: mail.text };
  } catch (err) {
    return failed(err) as { ok: false; message: string };
  }
}
