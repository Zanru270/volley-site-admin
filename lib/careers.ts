/* Careers: the jobs on the website's /careers page and the applications
   people send for them (supabase/careers.sql). Shared by the Jobs and Job
   applications pages, their actions, and (for the email wording) the
   website's applyForJob once mailing is set up. */

/* The careers page's wording (the `careers` setting; the website's
   content/careers.json is the same shape, and its default). Each list is
   a list of points or lines, added to and reordered in the live editor. */
export type CareersPage = {
  hero: { eyebrow: string; title: string; lines: string[]; intro: string };
  manifesto: { title: string; points: string[] };
  signingUp: { title: string; points: string[]; after: string };
  upside: { title: string; points: string[]; after: string };
  bottomLine: { title: string; lines: string[]; script: string };
  jobs: { eyebrow: string; title: string; empty: string };
  form: {
    eyebrow: string;
    privacy: string;
    button: string;
    thanks: { eyebrow: string; headline: string; message: string };
  };
};

// What the website shows until the page is saved here.
export const DEFAULT_CAREERS: CareersPage = {
  hero: {
    eyebrow: "Careers",
    title: "Work at Volley",
    lines: [
      "We don't build student accommodation.",
      "We build places people actually want to live in.",
    ],
    intro:
      "And we definitely don't hire people who just want a job. We hire people who want to build something that matters.",
  },
  manifesto: {
    title: "The Volley Manifesto",
    points: [
      "People come first. Always.",
      "Design is not decoration. It's the product.",
      "Community beats square meters.",
      "Details are everything.",
      "Energy > experience.",
      "If it's boring, we're not doing it.",
    ],
  },
  signingUp: {
    title: "What you're signing up for",
    points: ["Fast", "Demanding", "Occasionally chaotic", "Always ambitious"],
    after:
      "But if you're the kind of person who takes ownership, obsesses over details, gives a damn about people, and wants to build, you'll probably love it here.",
  },
  upside: {
    title: "The upside",
    points: [
      "You grow fast",
      "You build real things",
      "You become dangerous (in a good way)",
    ],
    after:
      "And you'll be part of a team that's trying to create something genuinely special, not just profitable.",
  },
  bottomLine: {
    title: "Bottom line",
    lines: [
      "If you want comfort, there are safer places.",
      'If you want to build something people talk about, something your friends want to live in, something you\'re proud to point at and say "I helped create that":',
    ],
    script: "Welcome to Volley.",
  },
  jobs: {
    eyebrow: "Available jobs",
    title: "Let's get you part of the Volley crew",
    empty:
      "No openings right now. Check back soon, or send your CV to Elaine and we'll keep it on file.",
  },
  form: {
    eyebrow: "Application form",
    privacy:
      "We'll only use these details, and your CV, to consider you for a role at Volley.",
    button: "Submit application",
    thanks: {
      eyebrow: "Application received",
      headline: "Thanks for applying!",
      message:
        "We read every application. If it's a match, someone from the team will be in touch.",
    },
  },
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  job_type: string;
  qualifications: string;
  experience: string;
  salary: string;
  summary: string;
  description: string;
  duties: string;
  open: boolean;
  sort: number;
  created_at?: string;
  updated_at?: string;
};

export const BLANK_JOB: Job = {
  id: "",
  title: "",
  department: "",
  location: "Pretoria",
  job_type: "",
  qualifications: "",
  experience: "",
  salary: "",
  summary: "",
  description: "",
  duties: "",
  open: true,
  sort: 0,
};

export type JobApplication = {
  id: string;
  job_id: string | null;
  job_title: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  address: string;
  cv_path: string;
  status: ApplicationStatus;
  notes: string;
  interview_at: string | null;
  emailed: Partial<Record<CareerEmailKind, string>>;
  created_at: string;
  updated_at: string;
};

/* Where an application stands, in the order it usually moves. "Reviewing"
   and "Closed" are marks for the team; Interview, Offered and Declined
   come with an email to the applicant (once mailing is set up); Hired
   is the end of the road. */
export const APPLICATION_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "interview", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
  { value: "declined", label: "Declined" },
  { value: "closed", label: "Closed" },
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["value"];

export const statusLabel = (s: string) =>
  APPLICATION_STATUSES.find((x) => x.value === s)?.label ?? s;

// The tabs on the Job applications page, with "all" for everyone.
export const APPLICATION_TABS = [
  "new",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "declined",
  "closed",
  "all",
] as const;
export type ApplicationTab = (typeof APPLICATION_TABS)[number];

/* ---- Emails ----------------------------------------------------------------

   What each person gets, worded here so the admin can show it before it
   goes. Mailing isn't set up yet: the admin shows these as previews, and
   the decisions only change the status. Once it is (lib/app/mailgun.ts
   sends the waitlist's), each decision sends its email and records when
   in `emailed`, and the website sends "received" as someone applies, and
   "team" to the team. */

export type CareerEmailKind =
  "received" | "interview" | "offer" | "decline" | "team";

// Whether mailing is set up: the windows say so until it is.
export const CAREER_EMAILS_LIVE = false;

const SIGN_OFF = "\n\nThe Volley team";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });

export function careerEmail(
  kind: CareerEmailKind,
  a: Pick<JobApplication, "name" | "surname" | "email" | "phone" | "job_title">,
  extra: { note?: string; interviewAt?: string; place?: string } = {},
): { to: string; subject: string; text: string } {
  const role = a.job_title || "a role at Volley";
  const note = extra.note?.trim() ? `\n\n${extra.note.trim()}` : "";
  switch (kind) {
    case "received":
      return {
        to: a.email,
        subject: `We've got your application: ${role}`,
        text: `Hi ${a.name},\n\nThanks for applying for ${role} at Volley. We read every application, and if it's a match, someone from the team will be in touch.${SIGN_OFF}`,
      };
    case "interview":
      return {
        to: a.email,
        subject: `Let's talk: ${role} at Volley`,
        text: `Hi ${a.name},\n\nWe loved your application for ${role} and would like to meet you.${
          extra.interviewAt
            ? `\n\nWhen: ${when(extra.interviewAt)}${extra.place?.trim() ? `\nWhere: ${extra.place.trim()}` : ""}`
            : "\n\nWe'll be in touch shortly to find a time that works."
        }\n\nReply to this email if you need to move it.${note}${SIGN_OFF}`,
      };
    case "offer":
      return {
        to: a.email,
        subject: `An offer from Volley: ${role}`,
        text: `Hi ${a.name},\n\nWe'd love you to join the Volley crew as ${role}. We'll send the details of the offer separately; reply to this email with any questions.${note}${SIGN_OFF}`,
      };
    case "decline":
      return {
        to: a.email,
        subject: `Your application for ${role}`,
        text: `Hi ${a.name},\n\nThank you for applying for ${role} at Volley, and for the time you put into it. We've decided not to take your application further this time.\n\nWe'll keep your details on file, and hope to see your name again.${note}${SIGN_OFF}`,
      };
    case "team":
      return {
        to: "the Volley team",
        subject: `New application: ${role}`,
        text: `${a.name} ${a.surname} applied for ${role}.\n\nEmail: ${a.email}\nPhone: ${a.phone}\n\nOpen it in the admin under Careers > Job applications.`,
      };
  }
}
