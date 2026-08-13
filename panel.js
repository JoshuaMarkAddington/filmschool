/* =====================================================================
   AUDITION PANEL — single source of truth
   ---------------------------------------------------------------------
   Every panelist on the audition page and every biography page is driven
   by this list. To add a new panelist:

     1. Upload their headshot to the repository (portrait crops look best).
     2. Add an entry below — copy an existing one and edit it.

   The gallery on audition.html and the biography page (panelist.html)
   both pick the change up automatically. No other file needs touching.

   Fields
     id     — short lowercase key used in the URL: panelist.html?id=stevi
     name   — displayed under the headshot
     role   — one short line under the name (their seat on the panel)
     photo  — image filename in the repository root
     focus  — CSS object-position for the crop; tweak if a face sits high
              or low in the frame (e.g. "center 15%")
     bio    — array of paragraphs, rendered in order on the bio page
   ===================================================================== */
window.PANELISTS = [
  {
    id: "stevi",
    name: "Stevi Ritchie",
    role: "Guest Panelist — Singing & Performance",
    photo: "Stevi_Headshot.jpg",
    focus: "center 20%",
    bio: [
      "Stevi Ritchie first became a household name on The X Factor in 2014, where he was mentored by Simon Cowell and finished the competition in sixth place. He returned to screens the following year on Celebrity Big Brother, where his humour and warmth quickly made him a fan favourite.",
      "Since then, Stevi has built a career as a singer and live performer, releasing his own singles and playing shows and private events across the UK. In 2016 he signed with Sony Japan and released the single “Come On, Come On, Come On”.",
      "Alongside his music, Stevi works regularly in theatre and pantomime — most recently playing Gaston in Beauty and the Beast in December 2025. On screen, he is credited in four films: Legacy, Pie n Mash, Betrayal and Watch Out for the Wolves.",
      "On our panel, Stevi brings the perspective of a performer who has come up through auditions at the highest level — and knows exactly what it takes to hold a room.",
    ],
  },
  {
    id: "joshua",
    name: "Joshua Addington",
    role: "Founder, Adders Film School",
    photo: "Joshua_Audition_Headshot.jpg",
    focus: "center 22%",
    bio: [
      "Joshua Addington is the founder of Adders Film School, which he set up on a simple conviction: young creatives deserve better than a watered-down experience. Rather than treating filmmaking as an after-school hobby club, the school trains students on the same class of industry-standard gear and software used on professional productions.",
      "That approach runs from the first draft of a script through to the final 4K HDR master — scriptwriting, directing, performance, cinematography and post-production, taught as the single craft it really is.",
      "On the audition panel, Joshua looks for the instinct and the appetite to learn that a two-week intensive can build on — not a finished performer, but a student ready to be one.",
    ],
  },
];
