/* The website's "Apply now" sign-ups, as the Volley app keeps them (table:
   waitlist, from Volley-App/supabase/migrations/015 and 025). Kept in step
   with the app admin's src/lib/waitlist.ts. */

export type WaitlistEntry = {
  id: string;
  created_at: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  house: string; // what they asked for, in the website's words: "Brooklyn"
  unit: string; // likewise: "2 Bedroom"
  parent_name: string;
  parent_surname: string;
  parent_phone: string;
  parent_email: string;
  status: string;
  admin_notes: string;
  decided_at: string | null;
  apartment_id: string | null; // where an accepted person was placed
  // Their interview, once it's scheduled (Volley-App migration 027).
  // Missing until that's run.
  interview_at?: string | null;
  interview_minutes?: number;
  interview_mode?: "in_person" | "online";
  interview_place?: string;
  interview_link?: string;
  interview_with?: string[];
  // Their driver's licence / ID photo in the private waitlist-ids bucket.
  // Null for sign-ups from before the form asked for it.
  id_document_path: string | null;
};

export const WAITLIST_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interview", label: "Interview" },
  // Only from before: the Volley app's admin no longer sets it.
  { value: "offered", label: "Offered a room" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "closed", label: "Closed" },
];

// Still waiting on a decision: these can be invited, accepted or declined.
export const UNDECIDED = ["new", "contacted", "interview", "offered"];

// The statuses set without an email: a mark for the team only.
export const MANUAL = ["new", "contacted", "closed"];

// The tabs, each a status, or everyone.
export const WAITLIST_TABS = ["new", "contacted", "interview", "accepted", "declined", "closed", "all"] as const;
export type WaitlistTab = (typeof WAITLIST_TABS)[number];

/* Who can run interviews, and the places they're held, as the Interviews
   page keeps them (the CMS's "interviews" setting). An interviewer's email
   gets the calendar invite; without one, they're only named. */
export type InterviewSettings = {
  interviewers: { name: string; email: string }[];
  places: string[];
};
export const DEFAULT_INTERVIEW_SETTINGS: InterviewSettings = {
  interviewers: [
    { name: "Elaine", email: "" },
    { name: "Etienne", email: "" },
    { name: "Andries", email: "" },
  ],
  places: ["Volley Baileys study center", "Volley Roper boardroom", "Volley Brooklyn reception"],
};

// An interview as it's scheduled.
export type InterviewPlan = {
  at: string; // ISO, with the Pretoria offset
  minutes: number;
  mode: "in_person" | "online";
  place: string;
  link: string;
  with: string[];
};

export const INTERVIEW_LENGTHS = [15, 30, 45, 60, 90];
