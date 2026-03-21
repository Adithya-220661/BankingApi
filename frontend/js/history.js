// ── SIDEBAR TOGGLE ────────────────────────────────────────────
function initSidebarToggle() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if(toggle) {
    toggle.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
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

// ── LOGOUT ────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── GLOBAL VARIABLES ──────────────────────────────────────────
let currentPage  = 1;
let totalPages   = 1;
let currentType  = 'all';
const rowsPerPage = 10;
let allTransactions = []; // for stats and export

// ── FETCH TRANSACTIONS FROM BACKEND ──────────────────────────
async function loadTransactions(page = 1, type = 'all') {
  const token = localStorage.getItem('token');
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  showEmpty('Loading transactions...');

  try {
    // Build URL with server-side pagination
    let url = `http://localhost:5000/api/transactions?page=${page}&limit=${rowsPerPage}`;
    if(type !== 'all') url += `&type=${type}`;

    const res  = await fetch(url, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();

    if(data.success){
      currentPage = data.page;
      totalPages  = data.pages;

      allTransactions = data.transactions;

      renderTable(data.transactions);
      updatePaginationButtons();

      // Load all for stats if first page
      if(page === 1) loadAllForStats(token, type);

    } else {
      showEmpty('Failed to load transactions.');
    }

  } catch(err) {
    console.log('History error:', err);
    showEmpty('❌ Cannot connect to server. Make sure backend is running.');
  }
}

// ── LOAD ALL TRANSACTIONS FOR STATS ──────────────────────────
async function loadAllForStats(token, type) {
  try {
    let url = `http://localhost:5000/api/transactions?page=1&limit=1000`;
    if(type !== 'all') url += `&type=${type}`;

    const res  = await fetch(url, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();

    if(data.success){
      updateStats(data.transactions);
    }
  } catch(err) {
    console.log('Stats error:', err);
  }
}

// ── RENDER TABLE ──────────────────────────────────────────────
function renderTable(transactions) {
  const tbody = document.getElementById('historyBody');

  if(!transactions || transactions.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#64748b; padding:30px;">
          No transactions found
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = '';

  transactions.forEach(txn => {
    const isCredit  = txn.type === 'deposit' || txn.type === 'transfer_received';
    const sign      = isCredit ? '+' : '-';
    const cssClass  = isCredit ? 'credit' : 'debit';
    const typeLabel = getTypeLabel(txn.type);
    const date      = new Date(txn.createdAt).toLocaleString('en-IN');

    const tr = document.createElement('tr');
    tr.className = `transaction-row ${cssClass}`;

    tr.innerHTML = `
      <td>${date}</td>
      <td><span class="txn-type ${cssClass}">${typeLabel}</span></td>
      <td>${txn.description || txn.type}</td>
      <td class="amount ${cssClass}">${sign}₹${txn.amount.toLocaleString('en-IN')}</td>
      <td>₹${txn.balanceAfter.toLocaleString('en-IN')}</td>
      <td><span class="status success">✓ ${txn.status}</span></td>
      <td>
        <button class="action-btn" onclick="viewDetails('${txn._id}')">
          👁️ View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ── GET TYPE LABEL ────────────────────────────────────────────
function getTypeLabel(type) {
  switch(type){
    case 'deposit':           return '📥 Credit';
    case 'withdrawal':        return '📤 Debit';
    case 'transfer_sent':     return '➡️ Transfer Out';
    case 'transfer_received': return '⬅️ Transfer In';
    default:                  return type;
  }
}

// ── UPDATE STATS ──────────────────────────────────────────────
function updateStats(transactions) {
  let totalCredits = 0;
  let totalDebits  = 0;
  let successCount = 0;

  transactions.forEach(txn => {
    const isCredit = txn.type === 'deposit' || txn.type === 'transfer_received';
    if(isCredit) totalCredits += txn.amount;
    else         totalDebits  += txn.amount;
    if(txn.status === 'success') successCount++;
  });

  const successRate = transactions.length > 0
    ? ((successCount / transactions.length) * 100).toFixed(1)
    : 0;

  document.getElementById('totalTransactions').textContent = transactions.length;
  document.getElementById('totalCredits').textContent      = `₹${totalCredits.toLocaleString('en-IN')}`;
  document.getElementById('totalDebits').textContent       = `₹${totalDebits.toLocaleString('en-IN')}`;
  document.getElementById('successRate').textContent       = `${successRate}%`;
}

// ── APPLY FILTERS ─────────────────────────────────────────────
function applyFilters() {
  currentType = document.getElementById('typeFilter').value;
  currentPage = 1;
  loadTransactions(currentPage, currentType);
}

// ── PAGINATION ────────────────────────────────────────────────
function changePage(direction) {
  if(direction === 'next' && currentPage < totalPages){
    currentPage++;
    loadTransactions(currentPage, currentType);
  } else if(direction === 'prev' && currentPage > 1){
    currentPage--;
    loadTransactions(currentPage, currentType);
  }
}

// ✅ FIXED: uses pointerEvents instead of disabled so onclick is never blocked
// ✅ FIXED: nextBtn lines removed since Next button was removed from HTML
function updatePaginationButtons() {
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent  = totalPages || 1;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  // Previous button
  if(currentPage >= totalPages || totalPages === 0){
  nextBtn.style.opacity       = '0.5';
  nextBtn.style.cursor        = 'not-allowed';
  nextBtn.style.pointerEvents = 'none';
  } else {
  nextBtn.style.opacity       = '1';
  nextBtn.style.cursor        = 'pointer';
  nextBtn.style.pointerEvents = 'auto';
}
  
}

// ── VIEW TRANSACTION DETAILS ──────────────────────────────────
async function viewDetails(id) {
  const token = localStorage.getItem('token');
  try {
    const res  = await fetch(`http://localhost:5000/api/transactions/${id}`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();

    if(data.success){
      const txn      = data.transaction;
      const isCredit = txn.type === 'deposit' || txn.type === 'transfer_received';
      const sign     = isCredit ? '+' : '-';
      const date     = new Date(txn.createdAt).toLocaleString('en-IN');

      alert(
        `Transaction Details:\n\n` +
        `Type:           ${getTypeLabel(txn.type)}\n` +
        `Amount:         ${sign}₹${txn.amount.toLocaleString()}\n` +
        `Date:           ${date}\n` +
        `Description:    ${txn.description || txn.type}\n` +
        `Balance Before: ₹${txn.balanceBefore.toLocaleString()}\n` +
        `Balance After:  ₹${txn.balanceAfter.toLocaleString()}\n` +
        `Status:         ${txn.status}\n` +
        `Reference ID:   ${txn._id}`
      );
    } else {
      alert('Transaction details not found.');
    }
  } catch(err) {
    alert('Cannot connect to server.');
  }
}

// ── EXPORT CSV ────────────────────────────────────────────────
function exportHistory() {
  if(allTransactions.length === 0){
    alert('No transactions to export.');
    return;
  }

  let csv = 'Date,Type,Description,Amount,Balance After,Status\n';
  allTransactions.forEach(txn => {
    const isCredit = txn.type === 'deposit' || txn.type === 'transfer_received';
    const sign     = isCredit ? '+' : '-';
    const date     = new Date(txn.createdAt).toLocaleString('en-IN');
    csv += `"${date}","${getTypeLabel(txn.type)}","${txn.description || txn.type}","${sign}₹${txn.amount}","₹${txn.balanceAfter}","${txn.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href  = URL.createObjectURL(blob);
  link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  alert('✅ Transactions exported successfully!');
}

// ── SHOW EMPTY MESSAGE ────────────────────────────────────────
function showEmpty(message) {
  document.getElementById('historyBody').innerHTML = `
    <tr>
      <td colspan="7" style="text-align:center; color:#64748b; padding:30px;">
        ${message}
      </td>
    </tr>`;
}

// ── ON PAGE LOAD ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  // Show admin link if admin
  const user      = JSON.parse(localStorage.getItem('user') || '{}');
  const adminLink = document.getElementById('adminLink');
  if(adminLink && user.role === 'admin'){
    adminLink.style.display = 'flex';
  }

  restoreMode();
  initSidebarToggle();
  loadTransactions(1, 'all');

  document.getElementById('modeToggle').addEventListener('click', toggleMode);

  // ✅ FIXED: pagination buttons attached via addEventListener, not onclick in HTML
  document.getElementById('prevBtn').addEventListener('click', () => changePage('prev'));
  document.getElementById('nextBtn').addEventListener('click', () => changePage('next'));

  // Fix logout link
  const logoutLink = document.querySelector('a[href="index.html"]');
  if(logoutLink){
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});