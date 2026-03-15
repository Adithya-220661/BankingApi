// ── SIDEBAR TOGGLE ────────────────────────────────────────────
function initSidebarToggle() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if(toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
      });
    });
  }
}

// ── DARK MODE ─────────────────────────────────────────────────
function toggleMode() {
  document.body.classList.toggle('dark-mode');
  const enabled = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', enabled);
  document.getElementById('modeToggle').textContent = 
    enabled ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

function restoreMode() {
  const dark = localStorage.getItem('darkMode') === 'true';
  if(dark) document.body.classList.add('dark-mode');
  document.getElementById('modeToggle').textContent = 
    dark ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

// ── POPULATE DASHBOARD WITH REAL DATA ────────────────────────
function populateUserData(user, transactions) {

  // Welcome header
  document.getElementById('welcomeHeader').textContent = 
    `Welcome, ${user.fullName}`;

  // Stats cards
  const stats = [
    { label: 'Account Balance',  value: `₹${user.balance.toLocaleString()}`, icon: '💰' },
    { label: 'Account Number',   value: user.accountNumber,                   icon: '🏦' },
    { label: 'Status',           value: user.isActive ? 'Active' : 'Locked',  icon: '✅' },
  ];

  const container = document.getElementById('statsContainer');
  container.innerHTML = '';

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `<h3>${s.icon} ${s.label}</h3><h1>${s.value}</h1>`;
    container.appendChild(card);
  });

  // Additional stat cards
  const additionalStats = [
    {
      label: 'Total Deposits',
      value: `₹${calculateTotal(transactions, 'deposit').toLocaleString()}`,
      icon:  '📈',
      color: '#10b981'
    },
    {
      label: 'Total Withdrawals',
      value: `₹${calculateTotal(transactions, 'withdrawal').toLocaleString()}`,
      icon:  '📉',
      color: '#ef4444'
    },
    {
      label: 'Total Transfers',
      value: `₹${calculateTotal(transactions, 'transfer_sent').toLocaleString()}`,
      icon:  '💸',
      color: '#f59e0b'
    },
  ];

  additionalStats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <h3>${s.icon} ${s.label}</h3>
      <h1 style="color: ${s.color}">${s.value}</h1>
    `;
    container.appendChild(card);
  });

  // Recent transactions table
  const txnBody = document.getElementById('txnTable').querySelector('tbody');
  txnBody.innerHTML = '';

  if(transactions.length === 0){
    txnBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; color:#64748b;">
          No transactions yet
        </td>
      </tr>`;
    return;
  }

  transactions.slice(0, 5).forEach(txn => {
    const tr  = document.createElement('tr');
    const isCredit = txn.type === 'deposit' || txn.type === 'transfer_received';
    const sign     = isCredit ? '+' : '-';
    const cssClass = isCredit ? 'income' : 'expense';
    const date     = new Date(txn.createdAt).toLocaleDateString('en-IN');

    tr.className = cssClass;
    tr.innerHTML = `
      <td>${date}</td>
      <td>${txn.description || txn.type}</td>
      <td class="amount ${cssClass}">${sign}₹${txn.amount.toLocaleString()}</td>
    `;
    txnBody.appendChild(tr);
  });
}

// ── HELPER: Calculate total for transaction type ──────────────
function calculateTotal(transactions, type) {
  return transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

// ── LOGOUT ────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── FETCH REAL DATA FROM BACKEND ─────────────────────────────
async function loadDashboard() {
  const token = localStorage.getItem('token');

  // If no token — redirect to login
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  try {
    // Fetch user profile and balance
    const profileRes = await fetch('http://localhost:5000/api/auth/me', {
      method:  'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const profileData = await profileRes.json();

    if(!profileData.success){
      alert('Session expired. Please login again.');
      logout();
      return;
    }

    // Fetch recent transactions
    const txnRes = await fetch('http://localhost:5000/api/transactions?limit=5', {
      method:  'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const txnData = await txnRes.json();

    const transactions = txnData.success ? txnData.transactions : [];

    // Populate dashboard with real data
    populateUserData(profileData.user, transactions);

  } catch(err) {
    console.log('Dashboard error:', err);
    alert('Cannot connect to server. Make sure backend is running.');
  }
}

// ── ON PAGE LOAD ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  restoreMode();
  loadDashboard();
  document.getElementById('modeToggle').addEventListener('click', toggleMode);
  initSidebarToggle();

  // Fix logout link
  const logoutLink = document.querySelector('a[href="index.html"]');
  if(logoutLink){
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});