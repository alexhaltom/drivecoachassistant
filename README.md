# Drive Coach Assistant — FIRST Match Timer

A modern web app for FIRST Robotics that shows a match countdown and **Active** / **Inactive** hub status for Red and Blue alliances. Hub status depends on which alliance scored more FUEL during autonomous (or was selected by FMS), so the app includes a slider to choose **Red** or **Blue** and updates the timer logic accordingly.

## Features

- **AUTO result slider** — Choose whether Red or Blue scored more in autonomous; hub status follows the official table.
- **Match timer** — 2:20 countdown with Start / Pause / Reset.
- **Phase display** — Current phase (Transition, Shift 1–4, End Game) and time range.
- **Hub status** — Red and Blue alliance hubs show Active or Inactive for the current phase.

## Run locally

From this folder (`drivecoachassistant`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

1. Push this repo to GitHub (or connect your Git provider in Vercel).
2. In [Vercel](https://vercel.com), **Add New Project** and import the repo.
3. Set the **Root Directory** to `drivecoachassistant` if the repo root is the parent folder; otherwise leave as default.
4. Deploy.

## Tech

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Vercel** for hosting
