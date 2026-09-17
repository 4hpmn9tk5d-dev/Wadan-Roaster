# Wadan Roster · वादन वेळापत्रक

A single-page roster for Dhol Tasha performances. No build step, no server: the whole
"database" is one file, `data/roster.json`, committed in this repo. Edits made in the
app are written back to that file through the GitHub API (last write wins).

```
index.html        app shell
styles.css        traditional maroon / kesari / gold theme
app.js            all logic (views, editing, import, GitHub sync)
data/roster.json  the db — wadak, teams, days, wadans
```

## 1. Host it (GitHub Pages)

1. Create a **private** repo, push these four files (keep the folder layout).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Open the Pages URL. The app loads `data/roster.json` from the site, read-only.

> Pages from a private repo is public unless your plan supports private Pages.
> The roster has names only, but don't put phone numbers or addresses in `notes` if that matters.

## 2. Let people edit (write-back to GitHub)

Each editor does this once, on their own phone/laptop:

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate.
   - Repository access: *Only select repositories* → this repo
   - Permissions: **Contents → Read and write**. Nothing else.
2. In the app, tap the button in the header (⚙ *Who are you?*), enter your name, owner, repo, branch, and the token → **Save settings**.

From then on:
- the app reads the *live* file via the API (no Pages cache delay),
- every edit is saved ~2.5 s after you stop typing, as a commit `roster: <name> · <time>`,
- if two people save at once, the second save re-reads the file's version and writes over it — **last write wins**. Git history keeps every earlier version, so nothing is truly lost.

The token lives only in that browser's localStorage. Without a token the app still works,
and edits stay in the browser until you connect or download the JSON.

## 3. Using it

- **Days** — a tab per date. Each wadan card shows time, team(s), dhol / tasha / zanz counts,
  and the roster grouped by instrument. Pencil = edit the wadan (name, venue, time, teams, notes,
  roster checklist). Green pills = borrowed from another team. Car icon = drives; `2D 3T` = brings
  2 dhol, 3 tasha. *Only my wadans* filters by your name.
- **My day** — type your name: every wadan you are on across both days as an animated route, what you play, the travel legs between venues (who else with a car is on both wadans if you are not driving), plus a copyable summary.
- **Teams** — drag wadak between team columns (or tap a wadak, then *move to*). Edit a team's
  colour, transport note and target size per wadan; the "needs attention" box flags wadans below target.
- **Wadak directory** — one row per person: instrument, team, car, what they bring,
  availability per day (tap the day numbers), notes. Everything is inline-editable.
- **Import** — paste a block of text and say what it is:
  - *Availability list* — one name per line; `( zanz )`, `( 2 Dhol )`, `( Need Ride )` are understood.
  - *Team roster* — lines like `Anup - Tasha (Car) - 2 Dhol, 3 Tasha`; `( 20th )` becomes a note.
  - *Wadan schedule* — lines like `Oakville Yuva - 11am`; the roster is filled with the chosen
    team's members who are available that day.
  Existing names are matched (first-name match on 4+ letters), new ones are created.
  You can also download the whole JSON or replace it from a file.
- **Copy WhatsApp summary** on the Days page gives a formatted message for the group.

## Data model (for next year, or another pathak)

```json
{
  "meta":        {"org", "event", "tagline", "updatedAt", "updatedBy"},
  "instruments": [{"id":"dhol","label":"Dhol","color":"#7B1C1C"}, …],
  "teams":       [{"id","name","short","color","target":{"dhol":9,"tasha":3},"transport"}],
  "wadak":       [{"id","name","instrument","team","car","brings":{"dhol":2},"notes"}],
  "days":        [{"date":"2026-09-19","available":["anup", …]}],
  "wadans":      [{"id","date","time":"11:00","name","venue","teams":["a"],"roster":["anup", …],"notes"}]
}
```

Add an instrument (say "Dhwaj") by adding it to `instruments`; every view, count and colour follows.
