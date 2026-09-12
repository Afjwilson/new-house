# New House Plan

A small, friendly web app for anyone who has just bought a house in the UK and is
staring at an empty hallway wondering where to start.

**Live app: https://afjwilson.github.io/new-house/**

It is one page, no accounts, no sign-up, and nothing is sent anywhere. You walk
round the house with your phone, tap through the suggestions for each room, and
the app adds it all up for you at the end.

## What it does

- **Room by room.** Every room comes with a list of the things people typically
  need to sort in a UK house — carpets, curtains and blinds, painting, cleaning,
  radiators, sockets and lighting, plumbing, furniture, the lot. Tap
  **Needs doing / Booked / Done / Not needed** on each one. That's the whole
  interaction.
- **Two sections that are not rooms.** *Moving in & admin* covers the UK paperwork
  (council tax, water, energy, Royal Mail redirect, insurance from exchange,
  broadband lead times, meter readings, locks, TV licence, electoral roll…) and
  *Whole house* covers the survey, boiler, electrics, damp, alarms and guarantees.
- **Add your own.** Spotted something? Type it in as you stand there.
- **Notes, dates, cost and who's doing it** on any job, so booked tradespeople and
  quotes live next to the job itself.
- **The big picture.** Everything combined: *"Flooring & carpets — 4 jobs across
  4 rooms: Bedroom 1, Bedroom 2, Stairs & landing, Hallway"*, plus who to call for
  each type of work, a things-to-buy list with lead-time warnings, a running cost
  estimate, and the same list arranged by when you plan to do it.
- **Dates & bookings.** A simple timeline of what is happening when, including
  completion and moving day.
- **Ask Claude.** Builds one well-structured message describing the whole house and
  everything you have noted, then asks for the right *order* of work — what must
  come before what, what to do before moving in, what to bundle into one quote,
  rough UK price ranges, and what you have missed. Copy it, paste it into
  [Claude](https://claude.ai/new).
- **Configurable.** Starts as a 3-bedroom house, but rename, reorder, delete and
  add rooms freely (en-suite, utility, WC, study, conservatory, garage, loft…).
  Each room type brings its own suggestions.
- **Two levels of detail.** "Just the essentials" keeps each room to a short list;
  "Show everything" adds the more specialist suggestions.

## Where your data lives

In your browser, on that device, and nowhere else. It saves automatically as you
type. Use **Save file** to download a `.json` backup — that is also how you move
your plan to another device or share it with someone, via **Set up & save → Open a
saved file**.

## Running or editing it yourself

There is no build step. Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

| File | What's in it |
| --- | --- |
| `index.html` | The page shell |
| `assets/styles.css` | All styling, including dark mode and a print layout |
| `assets/checklists.js` | **The checklist content** — categories, room types and every suggestion |
| `assets/app.js` | State, rendering, save/load, and the Claude prompt builder |

To change the suggestions, edit `assets/checklists.js`. Each one is a short array:

```js
["Radiator — works, needs bleeding, or replacing?", "heating", "week1", "Helpful hint shown underneath.", 1]
//  title                                            category   when     hint                                 1 = an "essentials" item
```

Rooms already in someone's saved plan keep the suggestions they were created with,
so editing the library only affects rooms added afterwards (or a fresh start).

## How it is published

GitHub Pages serves the site from the `gh-pages` branch, and
`.github/workflows/pages.yml` mirrors every push to the source branch there, so
the live site follows this repo automatically. To serve it from `main` instead,
change **Settings → Pages → Branch** and the workflow can be deleted.

## A note on the advice

It is general guidance for a UK home, gathered into one place — not professional
advice. Gas work must be done by a Gas Safe registered engineer, and electrical
work by a registered electrician.
