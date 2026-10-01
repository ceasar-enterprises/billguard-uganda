const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const db = require('./db');
const notifier = require('node-notifier');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'BillGuard Uganda',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#0a0e17',
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  db.init();
  createWindow();
  setupIPC();
  checkDueDates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function setupIPC() {
  ipcMain.handle('accounts:list', (_, type) => {
    const d = db.getDb();
    if (type) return d.prepare('SELECT * FROM accounts WHERE type = ? ORDER BY created_at DESC').all(type);
    return d.prepare('SELECT * FROM accounts ORDER BY type, created_at DESC').all();
  });

  ipcMain.handle('accounts:get', (_, id) => {
    return db.getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id);
  });

  ipcMain.handle('accounts:add', (_, data) => {
    const d = db.getDb();
    const result = d.prepare(`INSERT INTO accounts (type, provider, account_number, nickname, area, meter_number, loan_principal, loan_interest_rate, loan_term_months, loan_start_date, loan_lender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.type, data.provider, data.account_number, data.nickname || '', data.area || '', data.meter_number || '', data.loan_principal || 0, data.loan_interest_rate || 0, data.loan_term_months || 0, data.loan_start_date || '', data.loan_lender || '');
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('accounts:update', (_, id, data) => {
    const d = db.getDb();
    d.prepare(`UPDATE accounts SET type=?, provider=?, account_number=?, nickname=?, area=?, meter_number=?, loan_principal=?, loan_interest_rate=?, loan_term_months=?, loan_start_date=?, loan_lender=? WHERE id=?`).run(data.type, data.provider, data.account_number, data.nickname || '', data.area || '', data.meter_number || '', data.loan_principal || 0, data.loan_interest_rate || 0, data.loan_term_months || 0, data.loan_start_date || '', data.loan_lender || '', id);
    return { ok: true };
  });

  ipcMain.handle('accounts:delete', (_, id) => {
    db.getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('bills:list', (_, accountId) => {
    const d = db.getDb();
    if (accountId) return d.prepare('SELECT b.*, a.provider, a.account_number, a.type as account_type FROM bills b JOIN accounts a ON b.account_id = a.id WHERE b.account_id = ? ORDER BY b.due_date DESC').all(accountId);
    return d.prepare('SELECT b.*, a.provider, a.account_number, a.type as account_type FROM bills b JOIN accounts a ON b.account_id = a.id ORDER BY b.due_date DESC').all();
  });

  ipcMain.handle('bills:upcoming', () => {
    return db.getDb().prepare(`SELECT b.*, a.provider, a.account_number, a.type as account_type FROM bills b JOIN accounts a ON b.account_id = a.id WHERE b.status = 'pending' AND b.due_date >= date('now') ORDER BY b.due_date ASC LIMIT 20`).all();
  });

  ipcMain.handle('bills:overdue', () => {
    return db.getDb().prepare(`SELECT b.*, a.provider, a.account_number, a.type as account_type FROM bills b JOIN accounts a ON b.account_id = a.id WHERE b.status = 'pending' AND b.due_date < date('now') ORDER BY b.due_date ASC`).all();
  });

  ipcMain.handle('bills:add', (_, data) => {
    const d = db.getDb();
    const result = d.prepare('INSERT INTO bills (account_id, amount, due_date, period, status, notes) VALUES (?, ?, ?, ?, ?, ?)').run(data.account_id, data.amount, data.due_date, data.period || '', data.status || 'pending', data.notes || '');
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('bills:update', (_, id, data) => {
    db.getDb().prepare('UPDATE bills SET amount=?, due_date=?, period=?, status=?, notes=? WHERE id=?').run(data.amount, data.due_date, data.period || '', data.status || 'pending', data.notes || '', id);
    return { ok: true };
  });

  ipcMain.handle('bills:pay', (_, billId, paymentData) => {
    const d = db.getDb();
    d.prepare("UPDATE bills SET status = 'paid' WHERE id = ?").run(billId);
    const bill = d.prepare('SELECT * FROM bills WHERE id = ?').get(billId);
    const result = d.prepare('INSERT INTO payments (bill_id, account_id, amount, payment_date, method, reference, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(billId, bill.account_id, paymentData.amount || bill.amount, paymentData.payment_date || new Date().toISOString().split('T')[0], paymentData.method || '', paymentData.reference || '', paymentData.notes || '');
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('bills:delete', (_, id) => {
    db.getDb().prepare('DELETE FROM bills WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('payments:list', (_, accountId) => {
    const d = db.getDb();
    if (accountId) return d.prepare('SELECT p.*, a.provider, a.account_number, a.type as account_type FROM payments p JOIN accounts a ON p.account_id = a.id WHERE p.account_id = ? ORDER BY p.payment_date DESC').all(accountId);
    return d.prepare('SELECT p.*, a.provider, a.account_number, a.type as account_type FROM payments p JOIN accounts a ON p.account_id = a.id ORDER BY p.payment_date DESC').all();
  });

  ipcMain.handle('payments:add', (_, data) => {
    const d = db.getDb();
    const result = d.prepare('INSERT INTO payments (account_id, amount, payment_date, method, reference, notes) VALUES (?, ?, ?, ?, ?, ?)').run(data.account_id, data.amount, data.payment_date, data.method || '', data.reference || '', data.notes || '');
    if (data.bill_id) d.prepare("UPDATE bills SET status = 'paid' WHERE id = ?").run(data.bill_id);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('dashboard:summary', () => {
    const d = db.getDb();
    const waterCount = d.prepare("SELECT COUNT(*) as c FROM accounts WHERE type='water'").get().c;
    const elecCount = d.prepare("SELECT COUNT(*) as c FROM accounts WHERE type='electricity'").get().c;
    const loanCount = d.prepare("SELECT COUNT(*) as c FROM accounts WHERE type='loan'").get().c;
    const totalPending = d.prepare("SELECT COALESCE(SUM(amount),0) as t FROM bills WHERE status='pending'").get().t;
    const totalOverdue = d.prepare("SELECT COALESCE(SUM(amount),0) as t FROM bills WHERE status='pending' AND due_date < date('now')").get().t;
    const totalPaid = d.prepare("SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE payment_date >= date('now', '-30 days')").get().t;
    const totalLoanOwed = d.prepare("SELECT COALESCE(SUM(loan_principal),0) as t FROM accounts WHERE type='loan'").get().t;
    const waterPending = d.prepare("SELECT COALESCE(SUM(b.amount),0) as t FROM bills b JOIN accounts a ON b.account_id=a.id WHERE a.type='water' AND b.status='pending'").get().t;
    const elecPending = d.prepare("SELECT COALESCE(SUM(b.amount),0) as t FROM bills b JOIN accounts a ON b.account_id=a.id WHERE a.type='electricity' AND b.status='pending'").get().t;
    return { waterCount, elecCount, loanCount, totalPending, totalOverdue, totalPaid, totalLoanOwed, waterPending, elecPending };
  });

  ipcMain.handle('dashboard:monthly', () => {
    return db.getDb().prepare(`SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total FROM payments WHERE payment_date >= date('now', '-12 months') GROUP BY month ORDER BY month ASC`).all();
  });

  ipcMain.handle('ussd:nwsc', (_, accountNumber, area) => {
    return {
      code: `*165#`,
      steps: ['4 (Payments)', '1 (Utilities)', '2 (NWSC)', '1 (Check Balance)', accountNumber, area || 'Kampala'],
      sms: `Send BILL ${accountNumber} to 8185`
    };
  });

  ipcMain.handle('ussd:umeme', (_, accountNumber) => {
    return {
      code: `*185#`,
      steps: ['4 (Payments)', '1 (Utilities)', '1 (UMEME)', '3 (Check Balance)', accountNumber],
      sms: `Send BILL ${accountNumber} to 8185`
    };
  });

  ipcMain.handle('shell:open', (_, url) => {
    shell.openExternal(url);
  });
}

function checkDueDates() {
  setInterval(() => {
    const d = db.getDb();
    const overdue = d.prepare(`SELECT b.*, a.provider FROM bills b JOIN accounts a ON b.account_id = a.id WHERE b.status = 'pending' AND b.due_date = date('now')`).all();
    overdue.forEach(bill => {
      if (Notification.isSupported()) {
        new Notification({
          title: 'BillGuard — Bill Due Today!',
          body: `${bill.provider}: UGX ${bill.amount.toLocaleString()} due today`,
          urgency: 'critical'
        }).show();
      }
      notifier.notify({
        title: 'BillGuard — Bill Due Today!',
        message: `${bill.provider}: UGX ${bill.amount.toLocaleString()} due today`,
        sound: true
      });
    });

    const upcoming = d.prepare(`SELECT b.*, a.provider FROM bills b JOIN accounts a ON b.account_id = a.id WHERE b.status = 'pending' AND b.due_date = date('now', '+3 days') AND b.due_date != date('now')`).all();
    upcoming.forEach(bill => {
      if (Notification.isSupported()) {
        new Notification({
          title: 'BillGuard — Bill Due in 3 Days',
          body: `${bill.provider}: UGX ${bill.amount.toLocaleString()}`
        }).show();
      }
    });

    d.prepare(`UPDATE bills SET status = 'overdue' WHERE status = 'pending' AND due_date < date('now')`).run();
  }, 60000);
}
