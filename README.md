# BillGuard Uganda

**Utility Bill Monitor — Water, Electricity & Loan Tracker**

A desktop app that keeps every recurring bill and loan in one place, so nothing
is discovered late — when a penalty has already been applied.

---

## What is BillGuard?

BillGuard Uganda is a desktop application that monitors all your utility bills in one place:
- **6 water bill accounts** (NWSC)
- **1 electricity account** (UMEME)
- **5 mobile money loans**

No more missed payments or surprise penalties.

---

## Features

### Dashboard
- At-a-glance view of all accounts
- Total pending, overdue, and paid amounts
- Upcoming bills with countdown
- Overdue alerts

### Account Management
- Add/edit/delete water accounts (NWSC)
- Add/edit/delete electricity accounts (UMEME)
- Add/edit/delete mobile money loans
- Nickname accounts for easy identification

### Bill Tracking
- Add bills with amounts and due dates
- Mark bills as paid
- Track payment history
- Automatic overdue detection

### Loan Tracker
- Principal, interest rate, term
- Monthly payment calculation
- Remaining balance and months
- Start date tracking

### USSD Helper
- MTN and Airtel USSD codes for NWSC
- MTN USSD codes for UMEME
- SMS shortcuts (text BILL to 8185)

### Analytics
- Monthly spending chart
- Category breakdown (water vs electricity vs loans)

### Notifications
- Desktop alerts for bills due today
- 3-day advance warnings
- Automatic overdue marking

---

## Quick Start

### 1. Install Dependencies
```bash
cd billguard-uganda
npm install
```

### 2. Run the App
```bash
npm start
```

---

## Usage

### Adding Accounts
1. Click **Accounts** in the sidebar
2. Click **+ Add Account**
3. Select type (Water/Electricity/Loan)
4. Fill in details and save

### Adding Bills
1. Click **+ Add Bill** (top right) or go to **Bills**
2. Select the account
3. Enter amount and due date
4. Save

### Recording Payments
1. In Bills view, click **Pay** next to a pending bill
2. Enter payment details
3. Confirm

### Using USSD Helper
1. Go to **USSD Helper** in sidebar
2. View your accounts with their numbers
3. Follow the USSD steps on your phone

---

## Tech Stack

- **Electron** — Desktop app framework
- **Node.js** — Backend
- **SQLite** (better-sqlite3) — Local database
- **HTML/CSS/JS** — Dashboard UI
- **Chart.js-style** — Canvas analytics

---

## File Structure

```
billguard-uganda/
├── src/
│   ├── main.js           # Electron main process (IPC, notifications)
│   ├── preload.js        # Context bridge (API to renderer)
│   ├── db.js             # SQLite database (schema, queries)
│   └── renderer/
│       ├── index.html    # Dashboard UI
│       ├── styles.css    # Dark theme styles
│       └── app.js        # Frontend logic
├── assets/
│   └── icon.ico          # App icon
├── config/               # Future config
├── docs/
│   └── billguard-uganda.md
├── start.bat             # Launch script
├── package.json
└── README.md
```

---

## Database

SQLite database stored at: `%APPDATA%/billguard-uganda/billguard.db`

Tables:
- `accounts` — All utility accounts
- `bills` — Bills with due dates and status
- `payments` — Payment history
- `alerts` — Notification records
- `settings` — App configuration

---

## Future Features

- [ ] NWSC portal scraping (auto-fetch bills)
- [ ] UMEME mobile app API integration
- [ ] MTN MoMo / Airtel loan SMS parsing
- [ ] CSV/Excel import
- [ ] PDF bill generation
- [ ] Multi-currency support
- [ ] Cloud sync

---

## Copyright & Licence

Copyright 2026 Ceasar Enterprises.

**AGPL-3.0.** You may use, modify and redistribute this, including commercially.
The one condition: if you run a *modified* version over a network — for example
hosting BillGuard as a service — you must publish your modified source.

That clause is deliberate. BillGuard sits next to a paid bill-management service,
and the point of AGPL is that improving on it and charging for the improvement
without giving the improvement back is not allowed. Fork it for your own family's
bills, sell packaged builds, contribute upstream: all fine.

See [LICENSE](LICENSE).

---

## Credits

Built by **Ceasar** with assistance from **Arya**.

