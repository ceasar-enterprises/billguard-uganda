# BillGuard Uganda

## Project Overview
- **Name:** BillGuard Uganda
- **Type:** Desktop Application (Electron)
- **Purpose:** Monitor utility bills — 6 water accounts (NWSC), 1 electricity (UMEME), 5 mobile money loans
- **Status:** MVP built Jul 28, 2026
- **Copyright:** 2026 Ceasar. All Rights Reserved.

## Tech Stack
- **Framework:** Electron 33
- **Backend:** Node.js
- **Database:** SQLite (better-sqlite3)
- **UI:** HTML/CSS/JS (dark theme)
- **Notifications:** node-notifier + Electron Notification API

## File Structure
```
billguard-uganda/
├── src/
│   ├── main.js           # Electron main process (IPC handlers, notifications)
│   ├── preload.js        # Context bridge (API exposure to renderer)
│   ├── db.js             # SQLite database (schema, init, queries)
│   └── renderer/
│       ├── index.html    # Dashboard UI
│       ├── styles.css    # Dark theme styles
│       └── app.js        # Frontend logic (navigation, forms, charts)
├── assets/
│   └── icon.ico          # App icon
├── config/               # Future config files
├── docs/
│   └── billguard-uganda.md
├── start.bat             # Launch script
├── package.json          # Dependencies and scripts
└── README.md
```

## Database Schema
- **accounts** — Water, electricity, loan accounts with details
- **bills** — Bills with amounts, due dates, status (pending/paid/overdue)
- **payments** — Payment history with method and reference
- **alerts** — Notification records
- **settings** — App configuration

## Features
1. Dashboard — account summaries, upcoming/overdue bills, recent payments
2. Account management — add/edit/delete water, electricity, loan accounts
3. Bill tracking — add bills, mark paid, track history
4. Payment recording — method, reference, date
5. Loan tracker — principal, interest, monthly payments, remaining term
6. USSD helper — MTN/Airtel codes for NWSC, UMEME
7. SMS shortcuts — BILL to 8185
8. Analytics — monthly spending chart, category breakdown
9. Desktop notifications — due date alerts

## Run
```bash
cd billguard-uganda
npm start
```

## Desktop Shortcut
- **Location:** `Desktop\BillGuard Uganda.lnk`
- **Target:** `projects\billguard-uganda\start.bat`

## Future Features
- NWSC portal scraping (auto-fetch bills)
- UMEME mobile app API integration
- MTN MoMo / Airtel loan SMS parsing
- CSV/Excel import
- PDF bill generation
- Cloud sync

## Notes
- NWSC portal requires phone number for registration (currently unavailable)
- UMEME SMS query: text `BILL ACCOUNT_NUMBER` to 8185
- NWSC USSD: *165# → 4 → 1 → 2 → 1
- UMEME USSD: *165# → 4 → 1 → 1 → 3
