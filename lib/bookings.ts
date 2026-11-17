/* The website's "Book a tour" viewings, as the Volley app keeps them (table:
   tour_bookings, from Volley-App/supabase/migrations/015). Kept in step
   with the app admin's src/lib/bookings.ts. */

export type Booking = {
  id: string;
  created_at: string;
  house: string; // the building's slug: "brooklyn"
  house_name: string; // as the visitor saw it: "Volley Brooklyn"
  date: string; // "YYYY-MM-DD"
  start_time: string; // "HH:MM", Pretoria time
  end_time: string;
  hosts: string; // who's showing that slot, from the viewing schedule
  name: string;
  surname: string;
  email: string;
  phone: string;
  party: string; // who's coming along
  notes: string;
  status: string;
};

export const BOOKING_STATUSES = [
  { value: "booked", label: "Booked" },
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled", label: "Cancelled" },
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number]["value"];

export const isBookingStatus = (value: unknown): value is BookingStatus =>
  BOOKING_STATUSES.some((s) => s.value === value);

// The page's description, shared with its loading skeleton.
export const BOOKINGS_DESCRIPTION =
  'Everyone who has booked a viewing through "Book a tour" on the website, by day. Open someone for their details, and mark how it went.';
