import "server-only";

/* An interview as a calendar event: the "Add to calendar" links in its
   emails (Google, Outlook), and the .ics file attached to them, which
   Apple Calendar, Outlook and the rest open as an invite. Rescheduling
   sends the same `uid` with a higher `sequence`, so calendars move the
   event instead of adding a second; cancelling sends it as cancelled. */

export type CalendarEvent = {
  uid: string;
  sequence: number;
  start: Date;
  minutes: number;
  title: string;
  location: string;
  description: string;
  cancelled?: boolean;
};

// 20260114T080000Z: the form calendars read, in UTC.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const end = (e: CalendarEvent) => new Date(e.start.getTime() + e.minutes * 60_000);

// Text in an .ics line: its commas, semicolons and line breaks escaped.
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
// .ics lines are folded at 75 characters.
const fold = (line: string) => line.match(/.{1,73}/g)!.join("\r\n ");

export function ics(e: CalendarEvent, organiser: string) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Volley//Interviews//EN",
    `METHOD:${e.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SEQUENCE:${e.sequence}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    `ORGANIZER;CN=Volley:mailto:${organiser}`,
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}

export const googleLink = (e: CalendarEvent) =>
  `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(end(e))}`,
    details: e.description,
    location: e.location,
  })}`;

export const outlookLink = (e: CalendarEvent) =>
  `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: end(e).toISOString(),
    body: e.description,
    location: e.location,
  })}`;

// "Tuesday 14 January 2027, 10:00 to 10:30", in Pretoria time.
export function whenText(start: Date, minutes: number) {
  const tz = { timeZone: "Africa/Johannesburg" } as const;
  const day = start.toLocaleDateString("en-ZA", { ...tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString("en-ZA", { ...tz, hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time(start)} to ${time(new Date(start.getTime() + minutes * 60_000))}`;
}
