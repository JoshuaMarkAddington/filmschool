/* =====================================================================
   REHEARSAL TIMETABLE — single source of truth
   ---------------------------------------------------------------------
   Rehearsals for students who are offered a place after a successful
   audition. The timetable on audition.html is built from this list, so
   editing an entry here updates the page.

   NOTE ON TIMES: the registration agreement (the policy text on this
   form and policy.pdf) sets out attendance obligations but does not
   state rehearsal hours, so every day below uses the 9.30am – 4pm
   schedule. If a particular day runs to different hours, change that
   day's `start` / `end` and it will show on the page on its own.

   Fields
     weekday — day name, shown large on the card
     date    — the calendar date, e.g. "28 August 2026"
     start   — start time, e.g. "9.30am"
     end     — end time, e.g. "4pm"
     note    — optional extra line shown under the times
   ===================================================================== */
window.REHEARSALS = [
  { weekday: "Friday",   date: "28 August 2026",    start: "9.30am", end: "4pm" },
  { weekday: "Saturday", date: "29 August 2026",    start: "9.30am", end: "4pm" },
  { weekday: "Sunday",   date: "30 August 2026",    start: "9.30am", end: "4pm" },
  { weekday: "Monday",   date: "31 August 2026",    start: "9.30am", end: "4pm" },
  { weekday: "Wednesday", date: "2 September 2026", start: "9.30am", end: "4pm" },
  { weekday: "Thursday", date: "3 September 2026",  start: "9.30am", end: "4pm" },
  { weekday: "Saturday", date: "5 September 2026",  start: "9.30am", end: "4pm" },
];
