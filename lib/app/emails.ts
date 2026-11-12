import "server-only";

/* Copied from the Volley app's admin (volley-app-admin-panel/src/lib/emails.ts): keep the two in step.

   The waitlist emails, as HTML (in the website's colours, with inline
   styles, since email clients ignore stylesheets) plus a plain-text copy
   for clients that don't show HTML. Edit the wording here. */

const INK = "#1a1a18";
const BONE = "#e8e5d8";
const BLACK = "#272729";
const MUTED = "#6b6a63";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/* The shared frame: a bone page, a white card, the Volley wordmark, the
   paragraphs, an optional button, and the sign-off. */
function layout({
  heading,
  paragraphs,
  button,
  after,
}: {
  heading: string;
  paragraphs: string[];
  button?: { label: string; href: string; note: string };
  after?: string[];
}) {
  const p = (t: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK}">${t}</p>`;
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BONE};font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BONE};padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="padding:28px 32px;border-bottom:1px solid ${BONE}">
<span style="font-size:22px;font-weight:bold;letter-spacing:4px;color:${INK}">VOLLEY</span>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:24px;font-weight:normal;color:${INK}">${heading}</h1>
${paragraphs.map(p).join("\n")}
${
  button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 12px"><tr><td style="background:${BLACK}">
<a href="${esc(button.href)}" style="display:inline-block;padding:14px 28px;font-size:14px;color:${BONE};text-decoration:none">${button.label}</a>
</td></tr></table>
<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:${MUTED}">${button.note}<br><a href="${esc(button.href)}" style="color:${MUTED};word-break:break-all">${esc(button.href)}</a></p>`
    : ""
}
${(after ?? []).map(p).join("\n")}
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:${INK}">Warm regards,<br>The Volley team</p>
</td></tr>
</table>
<p style="margin:20px 0 0;font-size:11px;color:${MUTED}">Volley Group (Pty) Ltd · Nothing really ends</p>
</td></tr></table>
</body></html>`;
}

const textOf = (lines: (string | undefined)[]) =>
  [...lines.filter((l) => l !== undefined), "", "Warm regards,", "The Volley team"].join("\n\n").replace(/\n{3,}/g, "\n\n");

export type Placement = { building: string; unit: string; roomType: string };

// The admin's own line in an email, if there is one, as a paragraph.
const noteHtml = (note: string) => (note.trim() ? [esc(note.trim()).replace(/\n/g, "<br>")] : []);
const noteText = (note: string) => (note.trim() ? [note.trim()] : []);

/* To the student: the good news, where they're placed, and (last, as
   asked) the link that sets their password for the app and web app. */
export function acceptedStudent(name: string, place: Placement, link: string) {
  const subject = `Congratulations, ${name}! You have a room at Volley ${place.building}`;
  const where = `${place.roomType} unit ${place.unit} at Volley ${place.building}`;
  return {
    subject,
    html: layout({
      heading: `Congratulations, ${esc(name)}!`,
      paragraphs: [
        `We're thrilled to let you know that you've been accepted at Volley. Your home will be <strong>${esc(where)}</strong>.`,
        `We've also set up your Volley account. It's how you'll top up your wallet, book the shuttle, register guests, report anything that needs fixing, and see your electricity and water use, in the Volley app and on the web.`,
        `The Volley office will be in touch about your lease and moving in. If you have any questions before then, just reply to this email.`,
        `To finish setting up your account, choose a password with the button below. You'll use the same email and password in the Volley app and on the web.`,
      ],
      button: {
        label: "Set your password",
        href: link,
        note: "This link works once and expires, so use it soon. If it has expired, reply to this email and we'll send a new one. If the button doesn't work, copy this address into your browser:",
      },
    }),
    text: textOf([
      `Congratulations, ${name}!`,
      `We're thrilled to let you know that you've been accepted at Volley. Your home will be ${where}.`,
      `We've also set up your Volley account. It's how you'll top up your wallet, book the shuttle, register guests, report anything that needs fixing, and see your electricity and water use, in the Volley app and on the web.`,
      `The Volley office will be in touch about your lease and moving in. If you have any questions before then, just reply to this email.`,
      `To finish setting up your account, choose a password here (the same email and password work in the Volley app and on the web). The link works once and expires, so use it soon:`,
      link,
    ]),
  };
}

/* A fresh link for an accepted student whose first one expired. */
export function newPasswordLink(name: string, link: string) {
  return {
    subject: "Your Volley account: set your password",
    html: layout({
      heading: `Hi ${esc(name)},`,
      paragraphs: [
        `Here's a new link to set the password for your Volley account. You'll use the same email and password in the Volley app and on the web.`,
      ],
      button: {
        label: "Set your password",
        href: link,
        note: "This link works once and expires, so use it soon. If the button doesn't work, copy this address into your browser:",
      },
    }),
    text: textOf([
      `Hi ${name},`,
      `Here's a new link to set the password for your Volley account. You'll use the same email and password in the Volley app and on the web. It works once and expires, so use it soon:`,
      link,
    ]),
  };
}

// Someone an admin has added by hand, whatever their role.
export function newAccount(name: string, link: string) {
  return {
    subject: "Your Volley account: set your password",
    html: layout({
      heading: `Hi ${esc(name)},`,
      paragraphs: [
        `Your Volley account is ready. Set a password to start using it. You'll use the same email and password in the Volley app and on the web.`,
      ],
      button: {
        label: "Set your password",
        href: link,
        note: "This link works once and expires, so use it soon. If the button doesn't work, copy this address into your browser:",
      },
    }),
    text: textOf([
      `Hi ${name},`,
      `Your Volley account is ready. Set a password to start using it. You'll use the same email and password in the Volley app and on the web. The link works once and expires, so use it soon:`,
      link,
    ]),
  };
}

/* To the parent or guardian: the same news, without the student's
   personal set-password link. */
export function acceptedParent(parentName: string, studentName: string, place: Placement) {
  const where = `${place.roomType} unit ${place.unit} at Volley ${place.building}`;
  return {
    subject: `${studentName} has a room at Volley ${place.building}`,
    html: layout({
      heading: `Dear ${esc(parentName)},`,
      paragraphs: [
        `We're delighted to let you know that ${esc(studentName)} has been accepted at Volley. Their home will be <strong>${esc(where)}</strong>.`,
        `We've emailed ${esc(studentName)} a link to set up their Volley account. The Volley office will be in touch about the lease and moving in.`,
        `If you have any questions, just reply to this email.`,
      ],
    }),
    text: textOf([
      `Dear ${parentName},`,
      `We're delighted to let you know that ${studentName} has been accepted at Volley. Their home will be ${where}.`,
      `We've emailed ${studentName} a link to set up their Volley account. The Volley office will be in touch about the lease and moving in.`,
      `If you have any questions, just reply to this email.`,
    ]),
  };
}

// `note`: a line of the admin's own, added before the sign-off (this
// admin's addition; the app's admin doesn't pass one).
export function declinedStudent(name: string, note = "") {
  return {
    subject: "Your Volley waitlist application",
    html: layout({
      heading: `Dear ${esc(name)},`,
      paragraphs: [
        `Thank you for joining the Volley waitlist, and for your interest in living with us.`,
        `We're sorry to let you know that we aren't able to offer you a room this time. We had far more applications than rooms, and this was a hard decision.`,
        ...noteHtml(note),
        `We wish you all the best for your studies, and hope our paths cross again.`,
      ],
    }),
    text: textOf([
      `Dear ${name},`,
      `Thank you for joining the Volley waitlist, and for your interest in living with us.`,
      `We're sorry to let you know that we aren't able to offer you a room this time. We had far more applications than rooms, and this was a hard decision.`,
      ...noteText(note),
      `We wish you all the best for your studies, and hope our paths cross again.`,
    ]),
  };
}

export function declinedParent(parentName: string, studentName: string) {
  return {
    subject: `${studentName}'s Volley waitlist application`,
    html: layout({
      heading: `Dear ${esc(parentName)},`,
      paragraphs: [
        `Thank you for ${esc(studentName)}'s application to the Volley waitlist.`,
        `We're sorry to let you know that we aren't able to offer ${esc(studentName)} a room this time. We had far more applications than rooms, and this was a hard decision.`,
        `We wish ${esc(studentName)} all the best for their studies.`,
      ],
    }),
    text: textOf([
      `Dear ${parentName},`,
      `Thank you for ${studentName}'s application to the Volley waitlist.`,
      `We're sorry to let you know that we aren't able to offer ${studentName} a room this time. We had far more applications than rooms, and this was a hard decision.`,
      `We wish ${studentName} all the best for their studies.`,
    ]),
  };
}

/* ---- This admin's additions ------------------------------------------------
   Not in the Volley app's admin (yet): an interview invitation, and an
   acceptance for while there's no app to make an account in, which hands
   them to Elaine instead of sending a set-password link. And a note to the
   team (WAITLIST_NOTIFY_EMAIL) whenever someone's invited or accepted, so
   the follow-up never hangs on someone remembering. */

export type Offer = { building: string; roomType: string };

export function interviewStudent(name: string, building: string, note = "") {
  return {
    subject: `You've been shortlisted for an interview at Volley ${building}`,
    html: layout({
      heading: `Good news, ${esc(name)}!`,
      paragraphs: [
        `Thank you for joining the Volley waitlist. We're happy to let you know that you've been shortlisted for an interview for <strong>Volley ${esc(building)}</strong>.`,
        `Elaine from the Volley office will be in touch shortly to set a day and time that suits you.`,
        ...noteHtml(note),
        `If you have any questions before then, just reply to this email.`,
      ],
    }),
    text: textOf([
      `Good news, ${name}!`,
      `Thank you for joining the Volley waitlist. We're happy to let you know that you've been shortlisted for an interview for Volley ${building}.`,
      `Elaine from the Volley office will be in touch shortly to set a day and time that suits you.`,
      ...noteText(note),
      `If you have any questions before then, just reply to this email.`,
    ]),
  };
}

export function interviewParent(parentName: string, studentName: string, building: string) {
  return {
    subject: `${studentName} has been shortlisted for an interview at Volley ${building}`,
    html: layout({
      heading: `Dear ${esc(parentName)},`,
      paragraphs: [
        `We're happy to let you know that ${esc(studentName)} has been shortlisted for an interview for <strong>Volley ${esc(building)}</strong>.`,
        `Elaine from the Volley office will be in touch with ${esc(studentName)} shortly to set a day and time.`,
        `If you have any questions, just reply to this email.`,
      ],
    }),
    text: textOf([
      `Dear ${parentName},`,
      `We're happy to let you know that ${studentName} has been shortlisted for an interview for Volley ${building}.`,
      `Elaine from the Volley office will be in touch with ${studentName} shortly to set a day and time.`,
      `If you have any questions, just reply to this email.`,
    ]),
  };
}

const offerOf = (o: Offer) => `a ${o.roomType} at Volley ${o.building}`;

export function offeredStudent(name: string, offer: Offer, note = "") {
  return {
    subject: `Congratulations, ${name}! You have a place at Volley ${offer.building}`,
    html: layout({
      heading: `Congratulations, ${esc(name)}!`,
      paragraphs: [
        `We're thrilled to let you know that you've been accepted at Volley, for <strong>${esc(offerOf(offer))}</strong>.`,
        `Elaine from the Volley office will be in touch shortly with the next steps: your lease, your deposit and moving in.`,
        ...noteHtml(note),
        `If you have any questions before then, just reply to this email.`,
      ],
    }),
    text: textOf([
      `Congratulations, ${name}!`,
      `We're thrilled to let you know that you've been accepted at Volley, for ${offerOf(offer)}.`,
      `Elaine from the Volley office will be in touch shortly with the next steps: your lease, your deposit and moving in.`,
      ...noteText(note),
      `If you have any questions before then, just reply to this email.`,
    ]),
  };
}

export function offeredParent(parentName: string, studentName: string, offer: Offer) {
  return {
    subject: `${studentName} has a place at Volley ${offer.building}`,
    html: layout({
      heading: `Dear ${esc(parentName)},`,
      paragraphs: [
        `We're delighted to let you know that ${esc(studentName)} has been accepted at Volley, for <strong>${esc(offerOf(offer))}</strong>.`,
        `Elaine from the Volley office will be in touch with the next steps: the lease, the deposit and moving in.`,
        `If you have any questions, just reply to this email.`,
      ],
    }),
    text: textOf([
      `Dear ${parentName},`,
      `We're delighted to let you know that ${studentName} has been accepted at Volley, for ${offerOf(offer)}.`,
      `Elaine from the Volley office will be in touch with the next steps: the lease, the deposit and moving in.`,
      `If you have any questions, just reply to this email.`,
    ]),
  };
}

/* To the team: who's been invited or accepted, with everything needed to
   follow up, so Elaine can pick it up straight from her inbox. */
export function teamNotice(
  what: "interview" | "accepted",
  e: { name: string; surname: string; email: string; phone: string; house: string; unit: string; parent_name: string; parent_surname: string; parent_email: string; parent_phone: string },
  detail: string,
) {
  const who = `${e.name} ${e.surname}`.trim();
  const heading = what === "interview" ? `Set up an interview with ${who}` : `${who} has been accepted`;
  const lines = [
    what === "interview"
      ? `${who} has been invited to an interview for ${detail}, and told you'll be in touch to set a day and time.`
      : `${who} has been accepted for ${detail}, and told you'll be in touch with the lease, deposit and moving in.`,
    `Student: ${who}, ${e.email}, ${e.phone}`,
    `Asked for: ${e.house}, ${e.unit}`,
    `Parent or guardian: ${`${e.parent_name} ${e.parent_surname}`.trim()}, ${e.parent_email}, ${e.parent_phone}`,
  ];
  return {
    subject: heading,
    html: layout({ heading: esc(heading), paragraphs: lines.map(esc) }),
    text: textOf([heading, ...lines]),
  };
}

/* ---- Scheduled interviews ---------------------------------------------------
   Once a time is set (the Interviews page, or an application's Schedule
   interview): the student, their parent and each interviewer are told
   when and where, with "Add to calendar" links (and the .ics attached by
   the action). `kind`: a new time, a moved one, or a cancelled one. */

export type InterviewMail = {
  kind: "scheduled" | "moved" | "cancelled";
  building: string;
  when: string; // "Tuesday 14 January 2027, 10:00 to 10:30"
  where: string; // the place, or "Online"
  link: string; // the meeting link, online
  with: string[]; // the interviewers' names
  google: string;
  outlook: string;
};

const calendarLinks = (m: InterviewMail) =>
  `Add it to your calendar: <a href="${esc(m.google)}" style="color:${INK}">Google Calendar</a> · <a href="${esc(m.outlook)}" style="color:${INK}">Outlook</a> · or open the invite attached to this email (Apple Calendar and others).`;
// The plain-text copy (rare mail apps, and the admin's preview): the
// attached invite instead of the long Google and Outlook addresses, which
// the formatted email hides behind their names.
const CALENDAR_TEXT = `To add it to your calendar, open the invite attached to this email (Google Calendar, Outlook, Apple Calendar and others).`;

const detailsHtml = (m: InterviewMail) =>
  [
    `<strong>When:</strong> ${esc(m.when)}`,
    `<strong>Where:</strong> ${esc(m.where)}${m.link ? `, <a href="${esc(m.link)}" style="color:${INK}">join the meeting</a>` : ""}`,
    ...(m.with.length ? [`<strong>With:</strong> ${esc(listOf(m.with))}`] : []),
  ].join("<br>");
const detailsText = (m: InterviewMail) =>
  [`When: ${m.when}`, `Where: ${m.where}${m.link ? ` (${m.link})` : ""}`, ...(m.with.length ? [`With: ${listOf(m.with)}`] : [])].join("\n");
const listOf = (names: string[]) =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

export function interviewTimeStudent(name: string, m: InterviewMail, note = "") {
  const subject =
    m.kind === "cancelled"
      ? `Your Volley ${m.building} interview has been cancelled`
      : m.kind === "moved"
        ? `New time for your Volley ${m.building} interview`
        : `Your Volley ${m.building} interview: ${m.when}`;
  const opening =
    m.kind === "cancelled"
      ? `We're sorry, your interview for Volley ${m.building} on ${m.when} has been cancelled. Elaine from the Volley office will be in touch about a new time.`
      : m.kind === "moved"
        ? `Your interview for Volley ${m.building} has moved. Here's the new time:`
        : `Your interview for Volley ${m.building} is booked. Here are the details:`;
  return {
    subject,
    html: layout({
      heading: `Hi ${esc(name)},`,
      paragraphs: [
        esc(opening),
        ...(m.kind === "cancelled" ? [] : [detailsHtml(m), calendarLinks(m)]),
        ...noteHtml(note),
        m.kind === "cancelled"
          ? `If you have any questions, just reply to this email.`
          : `If the time doesn't work for you, just reply to this email and we'll find another.`,
      ],
    }),
    text: textOf([
      `Hi ${name},`,
      opening,
      ...(m.kind === "cancelled" ? [] : [detailsText(m), CALENDAR_TEXT]),
      ...noteText(note),
      m.kind === "cancelled"
        ? `If you have any questions, just reply to this email.`
        : `If the time doesn't work for you, just reply to this email and we'll find another.`,
    ]),
  };
}

export function interviewTimeParent(parentName: string, studentName: string, m: InterviewMail) {
  const subject =
    m.kind === "cancelled"
      ? `${studentName}'s Volley ${m.building} interview has been cancelled`
      : `${studentName}'s Volley ${m.building} interview: ${m.when}`;
  const opening =
    m.kind === "cancelled"
      ? `${studentName}'s interview for Volley ${m.building} on ${m.when} has been cancelled. Elaine from the Volley office will be in touch about a new time.`
      : m.kind === "moved"
        ? `${studentName}'s interview for Volley ${m.building} has moved. Here's the new time:`
        : `${studentName}'s interview for Volley ${m.building} is booked. Here are the details:`;
  return {
    subject,
    html: layout({
      heading: `Dear ${esc(parentName)},`,
      paragraphs: [esc(opening), ...(m.kind === "cancelled" ? [] : [detailsHtml(m)]), `If you have any questions, just reply to this email.`],
    }),
    text: textOf([`Dear ${parentName},`, opening, ...(m.kind === "cancelled" ? [] : [detailsText(m)]), `If you have any questions, just reply to this email.`]),
  };
}

/* To an interviewer: who, when and where, and how to reach them, with the
   invite attached so it lands in their calendar. */
export function interviewTimeTeam(
  interviewer: string,
  student: { name: string; surname: string; email: string; phone: string; house: string; unit: string },
  m: InterviewMail,
) {
  const who = `${student.name} ${student.surname}`.trim();
  const subject =
    m.kind === "cancelled" ? `Cancelled: interview with ${who}` : m.kind === "moved" ? `Moved: interview with ${who}` : `Interview with ${who}: ${m.when}`;
  const opening =
    m.kind === "cancelled"
      ? `The interview with ${who} on ${m.when} has been cancelled.`
      : m.kind === "moved"
        ? `The interview with ${who} has moved:`
        : `You have an interview with ${who}:`;
  const about = `${who} asked for ${student.house}, ${student.unit}. ${student.email}, ${student.phone}`;
  return {
    subject,
    html: layout({
      heading: `Hi ${esc(interviewer)},`,
      paragraphs: [esc(opening), ...(m.kind === "cancelled" ? [] : [detailsHtml(m), calendarLinks(m)]), esc(about)],
    }),
    text: textOf([`Hi ${interviewer},`, opening, ...(m.kind === "cancelled" ? [] : [detailsText(m), CALENDAR_TEXT]), about]),
  };
}
