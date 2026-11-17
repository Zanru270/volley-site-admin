"use server";

import { requireAdmin } from "@/lib/auth";
import { appSupabase } from "@/lib/appSupabase";
import { failed, type Result } from "@/lib/result";
import { isBookingStatus } from "@/lib/bookings";

/* Marks a tour booking booked, attended, a no-show or cancelled, in the
   Volley app's project, as its own admin does. No email goes out. A
   cancelled one frees its place: the website counts every booking for a
   time but the cancelled ones. */
export async function setBookingStatus(id: string, status: string): Promise<Result> {
  await requireAdmin();
  if (!isBookingStatus(status)) return { ok: false, message: "That isn't one of the choices." };
  const db = appSupabase();
  if (!db) return { ok: false, message: "The Volley app's database isn't connected." };
  try {
    const { data, error } = await db.from("tour_bookings").update({ status }).eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) return { ok: false, message: "Booking not found." };
    return {
      ok: true,
      message: status === "cancelled" ? "The time is free again on the website." : "Status updated.",
    };
  } catch (err) {
    return failed(err);
  }
}
