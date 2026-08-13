/* =====================================================================
   REHEARSAL TIMETABLE — single source of truth
   ---------------------------------------------------------------------
   Rehearsals for students who are offered a place after a successful
   audition. The timetable on audition.html is built from this list, so
   editing an entry here updates the page.

   Attendance at every date below is a condition of keeping a place in
   the show — see clause 3 (Rehearsal Attendance) of the policy agreement
   on the sign-up form. Keep the two in step if the timetable changes.

   Fields
     weekday  — day name, shown large on the card
     date     — the calendar date, e.g. "28 August 2026"
     tag      — optional badge across the top of the card, e.g. "Show day"
     sessions — one or more blocks for that day. Each has:
                  start  — e.g. "10.30am"
                  end    — e.g. "4.30pm"
                  label  — optional heading above the time, for a block
                           that isn't an ordinary rehearsal
                  note   — optional line under the time, e.g. a location
   ===================================================================== */
window.REHEARSALS = [
  {
    weekday: "Friday",
    date: "28 August 2026",
    sessions: [{ start: "10.30am", end: "4.30pm" }],
  },
  {
    weekday: "Saturday",
    date: "29 August 2026",
    sessions: [{ start: "10.30am", end: "4.30pm" }],
  },
  {
    weekday: "Sunday",
    date: "30 August 2026",
    sessions: [{ start: "10.30am", end: "4.30pm" }],
  },
  {
    weekday: "Monday",
    date: "31 August 2026",
    sessions: [
      { start: "9.30am", end: "12.30pm", label: "Rehearsal" },
      {
        start: "2pm",
        end: "3pm",
        label: "Flash mob performance",
        note: "Central Milton Keynes — exact location to be announced",
      },
    ],
  },
  {
    weekday: "Wednesday",
    date: "2 September 2026",
    sessions: [{ start: "6pm", end: "9pm" }],
  },
  {
    weekday: "Thursday",
    date: "3 September 2026",
    sessions: [{ start: "6pm", end: "9pm" }],
  },
  {
    weekday: "Saturday",
    date: "5 September 2026",
    tag: "Show day",
    sessions: [{ start: "9.30am", end: "4.30pm" }],
  },
];
