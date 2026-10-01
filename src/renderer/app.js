let currentPage = 'dashboard';
let currentFilter = 'all';
let editingAccountId = null;
let editingBillId = null;

document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  setupNav();
  setupFilters();
  setupQuickAdd();
  loadDashboard();
});

function setCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page);
    });
  });
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'accounts': loadAccounts(); break;
    case 'bills': loadBills(); break;
    case 'payments': loadPayments(); break;
    case 'loans': loadLoans(); break;
    case 'ussd': loadUSSD(); break;
    case 'analytics': loadAnalytics(); break;
  }
}

function setupFilters() {
  document.querySelectorAll('.filter-bar').forEach(bar => {
    bar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        if (currentPage === 'accounts') loadAccounts();
        if (currentPage === 'bills') loadBills();
      });
    });
  });
}

function setupQuickAdd() {
  document.getElementById('quickAddBtn').addEventListener('click', showAddBill);
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  const summary = await window.api.dashboard.summary();
  const upcoming = await window.api.bills.upcoming();
  const overdue = await window.api.bills.overdue();
  const payments = await window.api.payments.list();

  document.getElementById('statWaterPending').textContent = `UGX ${summary.waterPending.toLocaleString()}`;
  document.getElementById('statWaterCount').textContent = `${summary.waterCount} accounts`;
  document.getElementById('statElecPending').textContent = `UGX ${summary.elecPending.toLocaleString()}`;
  document.getElementById('statElecCount').textContent = `${summary.elecCount} accounts`;
  document.getElementById('statLoanOwed').textContent = `UGX ${summary.totalLoanOwed.toLocaleString()}`;
  document.getElementById('statLoanCount').textContent = `${summary.loanCount} loans`;
  document.getElementById('statOverdue').textContent = `UGX ${summary.totalOverdue.toLocaleString()}`;
  document.getElementById('statOverdueSub').textContent = `${overdue.length} bills`;

  renderBillList('upcomingBills', upcoming, false);
  renderBillList('overdueBills', overdue, true);
  renderPaymentList('recentPayments', payments.slice(0, 5));
}

function renderBillList(containerId, bills, showOverdue) {
  const container = document.getElementById(containerId);
  if (bills.length === 0) {
    container.innerHTML = `<div class="empty-state">${showOverdue ? 'No overdue bills' : 'No upcoming bills'}</div>`;
    return;
  }
  container.innerHTML = bills.map(bill => {
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    const dueClass = diffDays <= 0 ? 'urgent' : diffDays <= 3 ? 'urgent' : '';
    const dueText = diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`;
    return `
      <div class="bill-item">
        <div class="bill-info">
          <span class="bill-provider">${bill.provider}</span>
          <span class="bill-account">#${bill.account_number}</span>
        </div>
        <div class="bill-right">
          <span class="bill-amount">UGX ${bill.amount.toLocaleString()}</span>
          <span class="bill-due ${dueClass}">${dueText}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderPaymentList(containerId, payments) {
  const container = document.getElementById(containerId);
  if (payments.length === 0) {
    container.innerHTML = '<div class="empty-state">No payments yet</div>';
    return;
  }
  container.innerHTML = payments.map(p => `
    <div class="bill-item">
      <div class="bill-info">
        <span class="bill-provider">${p.provider}</span>
        <span class="bill-account">${p.payment_date}${p.method ? ' — ' + p.method : ''}</span>
      </div>
      <div class="bill-right">
        <span class="bill-amount" style="color: var(--accent-green)">UGX ${p.amount.toLocaleString()}</span>
      </div>
    </div>
  `).join('');
}

// ==================== ACCOUNTS ====================
async function loadAccounts() {
  const accounts = await window.api.accounts.list();
  const filtered = currentFilter === 'all' ? accounts : accounts.filter(a => a.type === currentFilter);
  const container = document.getElementById('accountsList');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No accounts found. Click "Add Account" to get started.</div>';
    return;
  }

  container.innerHTML = filtered.map(acc => `
    <div class="account-card ${acc.type}">
      <span class="account-type-badge">${acc.type}</span>
      <div class="account-nickname">${acc.nickname || acc.provider}</div>
      <div class="account-number">${acc.account_number}</div>
      <div class="account-meta">
        ${acc.type === 'water' ? `Area: ${acc.area || 'N/A'}` : ''}
        ${acc.type === 'electricity' ? `Meter: ${acc.meter_number || 'N/A'}` : ''}
        ${acc.type === 'loan' ? `Lender: ${acc.loan_lender || 'N/A'} | UGX ${acc.loan_principal.toLocaleString()}` : ''}
      </div>
      <div class="account-actions">
        <button class="btn btn-sm" onclick="editAccount(${acc.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteAccount(${acc.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function showAddAccount(type) {
  editingAccountId = null;
  const typeVal = type || 'water';
  const html = `
    <div class="modal-header">
      <h3>Add Account</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="accountForm" onsubmit="saveAccount(event)">
        <div class="form-group">
          <label>Type</label>
          <select id="accType" onchange="toggleAccountFields()">
            <option value="water" ${typeVal === 'water' ? 'selected' : ''}>Water (NWSC)</option>
            <option value="electricity" ${typeVal === 'electricity' ? 'selected' : ''}>Electricity (UMEME)</option>
            <option value="loan" ${typeVal === 'loan' ? 'selected' : ''}>Mobile Money Loan</option>
          </select>
        </div>
        <div class="form-group">
          <label>Provider</label>
          <input type="text" id="accProvider" placeholder="e.g. NWSC, UMEME, MTN MoMo" required>
        </div>
        <div class="form-group">
          <label>Account / Customer Number</label>
          <input type="text" id="accNumber" placeholder="Account number" required>
        </div>
        <div class="form-group">
          <label>Nickname (optional)</label>
          <input type="text" id="accNickname" placeholder="e.g. Home Water, Shop">
        </div>
        <div id="waterFields">
          <div class="form-group">
            <label>Area</label>
            <input type="text" id="accArea" placeholder="e.g. Kampala, Entebbe">
          </div>
        </div>
        <div id="elecFields" style="display:none">
          <div class="form-group">
            <label>Meter Number</label>
            <input type="text" id="accMeter" placeholder="Meter number">
          </div>
        </div>
        <div id="loanFields" style="display:none">
          <div class="form-row">
            <div class="form-group">
              <label>Principal (UGX)</label>
              <input type="number" id="accLoanPrincipal" placeholder="0">
            </div>
            <div class="form-group">
              <label>Interest Rate (%)</label>
              <input type="number" id="accLoanInterest" placeholder="0" step="0.1">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Term (months)</label>
              <input type="number" id="accLoanTerm" placeholder="0">
            </div>
            <div class="form-group">
              <label>Start Date</label>
              <input type="date" id="accLoanStart">
            </div>
          </div>
          <div class="form-group">
            <label>Lender</label>
            <input type="text" id="accLoanLender" placeholder="e.g. MTN MoMo, Airtel">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Account</button>
        </div>
      </form>
    </div>
  `;
  showModal(html);
  toggleAccountFields();
}

function toggleAccountFields() {
  const type = document.getElementById('accType').value;
  document.getElementById('waterFields').style.display = type === 'water' ? 'block' : 'none';
  document.getElementById('elecFields').style.display = type === 'electricity' ? 'block' : 'none';
  document.getElementById('loanFields').style.display = type === 'loan' ? 'block' : 'none';
}

async function saveAccount(e) {
  e.preventDefault();
  const type = document.getElementById('accType').value;
  const data = {
    type,
    provider: document.getElementById('accProvider').value,
    account_number: document.getElementById('accNumber').value,
    nickname: document.getElementById('accNickname').value,
    area: document.getElementById('accArea')?.value || '',
    meter_number: document.getElementById('accMeter')?.value || '',
    loan_principal: parseFloat(document.getElementById('accLoanPrincipal')?.value) || 0,
    loan_interest_rate: parseFloat(document.getElementById('accLoanInterest')?.value) || 0,
    loan_term_months: parseInt(document.getElementById('accLoanTerm')?.value) || 0,
    loan_start_date: document.getElementById('accLoanStart')?.value || '',
    loan_lender: document.getElementById('accLoanLender')?.value || ''
  };

  if (editingAccountId) {
    await window.api.accounts.update(editingAccountId, data);
  } else {
    await window.api.accounts.add(data);
  }
  closeModal();
  loadAccounts();
}

async function editAccount(id) {
  const acc = await window.api.accounts.get(id);
  editingAccountId = id;
  showAddAccount(acc.type);
  setTimeout(() => {
    document.getElementById('accType').value = acc.type;
    document.getElementById('accProvider').value = acc.provider;
    document.getElementById('accNumber').value = acc.account_number;
    document.getElementById('accNickname').value = acc.nickname || '';
    if (acc.type === 'water') document.getElementById('accArea').value = acc.area || '';
    if (acc.type === 'electricity') document.getElementById('accMeter').value = acc.meter_number || '';
    if (acc.type === 'loan') {
      document.getElementById('accLoanPrincipal').value = acc.loan_principal || '';
      document.getElementById('accLoanInterest').value = acc.loan_interest_rate || '';
      document.getElementById('accLoanTerm').value = acc.loan_term_months || '';
      document.getElementById('accLoanStart').value = acc.loan_start_date || '';
      document.getElementById('accLoanLender').value = acc.loan_lender || '';
    }
    toggleAccountFields();
  }, 50);
}

async function deleteAccount(id) {
  if (confirm('Delete this account and all its bills?')) {
    await window.api.accounts.delete(id);
    loadAccounts();
  }
}

// ==================== BILLS ====================
async function loadBills() {
  const bills = await window.api.bills.list();
  const filtered = currentFilter === 'all' ? bills : bills.filter(b => b.status === currentFilter);
  const container = document.getElementById('billsList');

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No bills found.</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Provider</th>
          <th>Account</th>
          <th>Amount</th>
          <th>Due Date</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(bill => `
          <tr>
            <td><span class="badge badge-${bill.account_type}">${bill.provider}</span></td>
            <td>${bill.account_number}</td>
            <td><strong>UGX ${bill.amount.toLocaleString()}</strong></td>
            <td>${bill.due_date}</td>
            <td><span class="badge badge-${bill.status}">${bill.status}</span></td>
            <td>
              ${bill.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="payBill(${bill.id})">Pay</button>` : ''}
              <button class="btn btn-sm" onclick="editBill(${bill.id})">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteBill(${bill.id})">Del</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function showAddBill(accountId) {
  editingBillId = null;
  const accounts = await window.api.accounts.list();
  const html = `
    <div class="modal-header">
      <h3>Add Bill</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="billForm" onsubmit="saveBill(event)">
        <div class="form-group">
          <label>Account</label>
          <select id="billAccountId" required>
            ${accounts.map(a => `<option value="${a.id}" ${accountId == a.id ? 'selected' : ''}>${a.nickname || a.provider} — ${a.account_number} (${a.type})</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount (UGX)</label>
            <input type="number" id="billAmount" placeholder="0" required>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input type="date" id="billDueDate" required>
          </div>
        </div>
        <div class="form-group">
          <label>Period (optional)</label>
          <input type="text" id="billPeriod" placeholder="e.g. Jul 2026">
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <input type="text" id="billNotes" placeholder="Any notes">
        </div>
        <div class="form-actions">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Bill</button>
        </div>
      </form>
    </div>
  `;
  showModal(html);
}

async function saveBill(e) {
  e.preventDefault();
  const data = {
    account_id: parseInt(document.getElementById('billAccountId').value),
    amount: parseFloat(document.getElementById('billAmount').value),
    due_date: document.getElementById('billDueDate').value,
    period: document.getElementById('billPeriod').value,
    notes: document.getElementById('billNotes').value
  };

  if (editingBillId) {
    await window.api.bills.update(editingBillId, { ...data, status: 'pending' });
  } else {
    await window.api.bills.add(data);
  }
  closeModal();
  if (currentPage === 'bills') loadBills();
  else loadDashboard();
}

async function editBill(id) {
  const bills = await window.api.bills.list();
  const bill = bills.find(b => b.id === id);
  if (!bill) return;
  editingBillId = id;
  await showAddBill(bill.account_id);
  setTimeout(() => {
    document.getElementById('billAmount').value = bill.amount;
    document.getElementById('billDueDate').value = bill.due_date;
    document.getElementById('billPeriod').value = bill.period || '';
    document.getElementById('billNotes').value = bill.notes || '';
  }, 50);
}

async function payBill(id) {
  const html = `
    <div class="modal-header">
      <h3>Record Payment</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form onsubmit="confirmPayBill(event, ${id})">
        <div class="form-row">
          <div class="form-group">
            <label>Amount (UGX)</label>
            <input type="number" id="payAmount" required>
          </div>
          <div class="form-group">
            <label>Payment Date</label>
            <input type="date" id="payDate" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Method</label>
          <select id="payMethod">
            <option value="Mobile Money">Mobile Money</option>
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Reference (optional)</label>
          <input type="text" id="payRef" placeholder="Transaction reference">
        </div>
        <div class="form-actions">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-success">Confirm Payment</button>
        </div>
      </form>
    </div>
  `;
  showModal(html);
}

async function confirmPayBill(e, billId) {
  e.preventDefault();
  await window.api.bills.pay(billId, {
    amount: parseFloat(document.getElementById('payAmount').value),
    payment_date: document.getElementById('payDate').value,
    method: document.getElementById('payMethod').value,
    reference: document.getElementById('payRef').value
  });
  closeModal();
  if (currentPage === 'bills') loadBills();
  else loadDashboard();
}

async function deleteBill(id) {
  if (confirm('Delete this bill?')) {
    await window.api.bills.delete(id);
    if (currentPage === 'bills') loadBills();
    else loadDashboard();
  }
}

// ==================== PAYMENTS ====================
async function loadPayments() {
  const payments = await window.api.payments.list();
  const container = document.getElementById('paymentsList');

  if (payments.length === 0) {
    container.innerHTML = '<div class="empty-state">No payments recorded yet.</div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Provider</th>
          <th>Account</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Reference</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map(p => `
          <tr>
            <td>${p.payment_date}</td>
            <td><span class="badge badge-${p.account_type}">${p.provider}</span></td>
            <td>${p.account_number}</td>
            <td><strong>UGX ${p.amount.toLocaleString()}</strong></td>
            <td>${p.method || '—'}</td>
            <td>${p.reference || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function showAddPayment() {
  const accounts = await window.api.accounts.list();
  const html = `
    <div class="modal-header">
      <h3>Record Payment</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form onsubmit="savePayment(event)">
        <div class="form-group">
          <label>Account</label>
          <select id="payAccId" required>
            ${accounts.map(a => `<option value="${a.id}">${a.nickname || a.provider} — ${a.account_number}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Amount (UGX)</label>
            <input type="number" id="payAmt" required>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="payDt" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Method</label>
          <select id="payMd">
            <option value="Mobile Money">Mobile Money</option>
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </div>
        <div class="form-group">
          <label>Reference</label>
          <input type="text" id="payRf" placeholder="Transaction reference">
        </div>
        <div class="form-actions">
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  `;
  showModal(html);
}

async function savePayment(e) {
  e.preventDefault();
  await window.api.payments.add({
    account_id: parseInt(document.getElementById('payAccId').value),
    amount: parseFloat(document.getElementById('payAmt').value),
    payment_date: document.getElementById('payDt').value,
    method: document.getElementById('payMd').value,
    reference: document.getElementById('payRf').value
  });
  closeModal();
  loadPayments();
}

// ==================== LOANS ====================
async function loadLoans() {
  const loans = await window.api.accounts.list('loan');
  const container = document.getElementById('loansList');

  if (loans.length === 0) {
    container.innerHTML = '<div class="empty-state">No loans added yet.</div>';
    return;
  }

  container.innerHTML = loans.map(loan => {
    const monthlyPayment = loan.loan_principal > 0 && loan.loan_term_months > 0
      ? (loan.loan_principal * (1 + loan.loan_interest_rate / 100)) / loan.loan_term_months
      : 0;
    const totalOwed = loan.loan_principal * (1 + loan.loan_interest_rate / 100);
    const startDate = loan.loan_start_date ? new Date(loan.loan_start_date) : null;
    let monthsElapsed = 0;
    let monthsRemaining = loan.loan_term_months;
    if (startDate) {
      monthsElapsed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24 * 30));
      monthsRemaining = Math.max(0, loan.loan_term_months - monthsElapsed);
    }

    return `
      <div class="loan-card">
        <div class="loan-lender">${loan.loan_lender || 'Unknown Lender'}</div>
        <div class="loan-name">${loan.nickname || loan.account_number}</div>
        <div class="loan-details">
          <div class="loan-detail">
            <span class="loan-detail-label">Principal</span>
            <span class="loan-detail-value">UGX ${loan.loan_principal.toLocaleString()}</span>
          </div>
          <div class="loan-detail">
            <span class="loan-detail-label">Interest Rate</span>
            <span class="loan-detail-value">${loan.loan_interest_rate}%</span>
          </div>
          <div class="loan-detail">
            <span class="loan-detail-label">Total Owed</span>
            <span class="loan-detail-value" style="color: var(--accent-red)">UGX ${totalOwed.toLocaleString()}</span>
          </div>
          <div class="loan-detail">
            <span class="loan-detail-label">Monthly Payment</span>
            <span class="loan-detail-value">UGX ${monthlyPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          </div>
          <div class="loan-detail">
            <span class="loan-detail-label">Months Remaining</span>
            <span class="loan-detail-value">${monthsRemaining} / ${loan.loan_term_months}</span>
          </div>
          <div class="loan-detail">
            <span class="loan-detail-label">Start Date</span>
            <span class="loan-detail-value">${loan.loan_start_date || 'N/A'}</span>
          </div>
        </div>
        <div class="account-actions">
          <button class="btn btn-sm" onclick="editAccount(${loan.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAccount(${loan.id})">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function showAddLoan() {
  showAddAccount('loan');
}

// ==================== USSD ====================
async function loadUSSD() {
  const accounts = await window.api.accounts.list('water');
  const elecAccounts = await window.api.accounts.list('electricity');

  document.getElementById('ussdNWSC').innerHTML = accounts.map(a =>
    `<div class="ussd-account-row"><span class="account-ref">${a.nickname || a.account_number}</span><span>${a.area || 'Kampala'}</span></div>`
  ).join('') || '<div class="empty-state">No water accounts</div>';

  document.getElementById('ussdNWSCAirtel').innerHTML = accounts.map(a =>
    `<div class="ussd-account-row"><span class="account-ref">${a.nickname || a.account_number}</span><span>${a.area || 'Kampala'}</span></div>`
  ).join('') || '<div class="empty-state">No water accounts</div>';

  document.getElementById('ussdUMEME').innerHTML = elecAccounts.map(a =>
    `<div class="ussd-account-row"><span class="account-ref">${a.nickname || a.account_number}</span><span>${a.meter_number || ''}</span></div>`
  ).join('') || '<div class="empty-state">No electricity accounts</div>';

  const smsContainer = document.getElementById('smsShortcuts');
  let smsHtml = '<p class="sms-item"><strong>UMEME:</strong> Send <code>BILL ACCOUNT_NUMBER</code> to <strong>8185</strong></p>';
  elecAccounts.forEach(a => {
    smsHtml += `<p class="sms-item">${a.nickname || a.account_number}: <code>BILL ${a.account_number}</code> to <strong>8185</strong></p>`;
  });
  smsContainer.innerHTML = smsHtml;
}

// ==================== ANALYTICS ====================
async function loadAnalytics() {
  const monthly = await window.api.dashboard.monthly();
  const summary = await window.api.dashboard.summary();

  renderMonthlyChart(monthly);
  renderCategoryChart(summary);
}

function renderMonthlyChart(data) {
  const canvas = document.getElementById('monthlyChart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = 250;
  ctx.clearRect(0, 0, w, h);

  if (data.length === 0) {
    ctx.fillStyle = '#5a6480';
    ctx.font = '13px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No payment data yet', w / 2, h / 2);
    return;
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => d.total)) * 1.1 || 1;
  const barWidth = Math.min(40, (chartW / data.length) - 10);

  data.forEach((d, i) => {
    const x = padding.left + (i * (chartW / data.length)) + (chartW / data.length - barWidth) / 2;
    const barH = (d.total / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    const gradient = ctx.createLinearGradient(x, y, x, y + barH);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#8892a8';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(d.month.slice(5), x + barWidth / 2, h - 10);

    ctx.fillStyle = '#f0f4ff';
    ctx.font = '10px Inter';
    ctx.fillText((d.total / 1000).toFixed(0) + 'K', x + barWidth / 2, y - 6);
  });

  ctx.strokeStyle = '#2a3550';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = '#5a6480';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(((maxVal / 4) * (4 - i) / 1000).toFixed(0) + 'K', padding.left - 8, y + 4);
  }
}

function renderCategoryChart(summary) {
  const canvas = document.getElementById('categoryChart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = 250;
  ctx.clearRect(0, 0, w, h);

  const data = [
    { label: 'Water', value: summary.waterPending, color: '#3b82f6' },
    { label: 'Electricity', value: summary.elecPending, color: '#f59e0b' },
    { label: 'Loans', value: summary.totalLoanOwed, color: '#a855f7' }
  ];

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    ctx.fillStyle = '#5a6480';
    ctx.font = '13px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', w / 2, h / 2);
    return;
  }

  const centerX = w / 2;
  const centerY = h / 2 - 10;
  const radius = Math.min(w, h) / 2 - 40;
  let startAngle = -Math.PI / 2;

  data.forEach(d => {
    if (d.value === 0) return;
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#1a2235';
  ctx.fill();

  ctx.fillStyle = '#f0f4ff';
  ctx.font = 'bold 16px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(`UGX ${(total / 1000).toFixed(0)}K`, centerX, centerY + 2);
  ctx.font = '11px Inter';
  ctx.fillStyle = '#8892a8';
  ctx.fillText('Total', centerX, centerY + 18);

  let legendY = h - 30;
  let legendX = w / 2 - 120;
  data.forEach(d => {
    ctx.fillStyle = d.color;
    ctx.fillRect(legendX, legendY - 8, 10, 10);
    ctx.fillStyle = '#8892a8';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`${d.label}: UGX ${(d.value / 1000).toFixed(0)}K`, legendX + 14, legendY);
    legendX += 100;
  });
}

// ==================== MODAL ====================
function showModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingAccountId = null;
  editingBillId = null;
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
