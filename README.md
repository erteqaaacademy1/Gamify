# MINDSET ARENA — Real-Time Multiplayer

One trainer hosts a game; participants join from their own phones with a 6-digit PIN (or QR code), pick a team, and play together live. Pure HTML/CSS/vanilla JS (ES modules) + Firebase Realtime Database + anonymous Auth. Deploys to GitHub Pages.

## Files
`index.html` + `app.js` (landing/router) · `trainer.js` (host dashboard) · `participant.js` (mobile UI) · `game-engine.js` (questions, scoring, shared views) · `firebase-service.js` · `firebase-config.js` (**you edit this**) · `database.rules.json` (**you paste this**) · `style.css` · `local.html` + `local-script.js` (original single-screen game, still works offline).

## 1. Firebase setup (≈10 minutes, free Spark plan is enough)
1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
3. **Build → Realtime Database → Create database** (choose a region, start in *locked mode*).
4. **Realtime Database → Rules** tab → paste the full contents of `database.rules.json` → **Publish**.
5. **Project settings (gear) → General → Your apps → Web (`</>`) → register app** (skip Hosting). Copy the `firebaseConfig` values into `firebase-config.js`. Make sure `databaseURL` is present (Realtime Database page shows it).
6. **Authentication → Settings → Authorized domains → Add** `<your-username>.github.io` (and `localhost` is already allowed).
7. Never put service-account or Admin keys in this project. The web config values are identifiers, not secrets; the rules are what protect your data.

## 2. Deploy to GitHub Pages
Upload all files to a repository → **Settings → Pages → Deploy from a branch → main / root**. Open `https://<user>.github.io/<repo>/`. (Opening `index.html` as `file://` will not work for multiplayer because ES modules and Firebase Auth need http(s); use GitHub Pages or `npx serve`.)

## 3. Running a session
1. Trainer: **HOST A GAME** → set teams, colours, rounds, timers → **Create game room**. A PIN, QR code and join link appear.
2. Participants: scan the QR (or open the site → **JOIN A GAME**) → PIN + name → pick team → **JOIN TEAM**.
3. Trainer watches the live waiting room (move/remove players, close registration, toggle team switching) → **START GAME**. Teams lock.
4. Per question the trainer drives: Start round → Show options (answer timer) → Reveal. Each team submits **one** answer (locked for the team; trainer can reset it). Reveal auto-awards +100 per correct team; the trainer awards +50/+50/+20/+30 and manual ± points. Everyone's leaderboard animates live.
5. **End game** → final results on all screens → **Close room**.

## Security model (database.rules.json)
- Only the user who created `rooms/$pin` (its `host` uid) can write `cfg`, `st` (question/phase/timer), `sc` (scores), `rv`, `aw`, status, or other players' records.
- A participant can only: write their own `players/<uid>` record (lobby only, registration open, valid team, name ≤ 20 chars; switching only if allowed), write **their own team's** single submission for the **current** question while the phase is `answer` (cannot overwrite — write-once), and set their own presence flag.
- Reconnect/refresh: the anonymous uid is persisted by Firebase Auth, so participants and the host resume automatically. Game state lives in the database, so a trainer disconnect never resets the game; participants see "Connection interrupted. Reconnecting..." and a "trainer offline" notice.

## Known limits (honest notes)
- **Correct answers ship in `game-engine.js`**, so a determined participant could read them in the browser. Rules stop them changing scores or revealing for others, but hiding answers fully requires a server (Cloud Functions). Fine for a live classroom.
- Duplicate-name prevention is client-side (the rules cannot enumerate other players); the uid already prevents one device joining twice.
- Rooms older than 24 h are refused by clients; delete old `rooms/*` nodes from the console occasionally. The Spark plan allows ~100 simultaneous connections.
- Sound effects, confetti, hints and the Hot Seat from single-screen mode are not in multiplayer; use `local.html` for those.
- Customising questions: edit `R` and `Q` in `game-engine.js` (same format as before).

---
# v2 — Custom Game Builder
**Trainer flow:** open the site → HOST A GAME → **My Games** (your Mindset template is added automatically the first time) → **＋ New game** / **Edit** / **Duplicate** / **Delete** / **Host**.
The builder has 6 steps: 1 Game Info (title, topic, trainer, instructions, default time, points, speed bonus, penalty, passing score) → 2 Rounds (add, rename, describe, pick activity type, drag or ▲▼ to reorder, delete) → 3 Questions (10 types: multiple choice, true/false, scenario, open-ended, ranking, matching, image, discussion, what-would-you-do, team challenge; each with explanation, image, time, points, difficulty, reveal mode) → 4 Design (theme, colours, background, cover, logo) → 5 Preview + validation → 6 Save draft / Publish / Host. Changes autosave after about a second.
**Scoring:** choice, ranking and matching score automatically (ranking and matching give partial credit; speed bonus applies to fully correct answers; wrong answers can lose points). Open-ended, discussion and team questions are scored by you with *Full / Half* buttons or the manual ± box.
**Sessions:** hosting copies the game into `rooms/<PIN>/game`, so editing or deleting the template never changes a running game.

## Firebase change (required once)
Re-publish `database.rules.json` (Realtime Database → Rules). New: `games/<uid>` is readable and writable only by its owner, and an answer may now also be an array (ranking and matching). Nothing else in your Firebase setup changes.
Note: your game library belongs to your browser's anonymous Firebase login. Use the same browser profile to see it again; clearing site data loses access to it.
