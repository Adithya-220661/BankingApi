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

// ── LOGOUT ────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── LOAD CURRENT BALANCE ──────────────────────────────────────
async function loadBalance() {
  const token = localStorage.getItem('token');
  try {
    const res  = await fetch('http://localhost:5000/api/account/balance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if(data.success){
      document.getElementById('currentBalance').textContent =
        `₹${data.balance.toLocaleString('en-IN')}`;
    }
  } catch(err) {
    document.getElementById('currentBalance').textContent = '₹0';
  }
}

// ── UPDATE TRANSFER SUMMARY ───────────────────────────────────
function updateSummary() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const fee    = amount > 100000 ? 50 : 0;
  const total  = amount + fee;

  document.getElementById('summaryAmount').textContent =
    `₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
  document.getElementById('summaryFee').textContent =
    fee === 0 ? 'FREE' : `₹${fee}`;
  document.getElementById('summaryTotal').textContent =
    `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
}

// ── VALIDATE ACCOUNT NUMBER ───────────────────────────────────
function validateAccountNumber(account) {
  const cleaned = account.trim();
  // Accept alphanumeric 10 to 16 characters
  return /^[a-zA-Z0-9]{10,16}$/.test(cleaned);
}

// ── QUICK TRANSFER HELPER ─────────────────────────────────────
function transferToRecipient(name, account) {
  document.getElementById('receiverName').value    = name;
  document.getElementById('receiverAccount').value = account;
  document.getElementById('amount').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── LOAD RECENT RECIPIENTS ────────────────────────────────────
function loadRecentRecipients() {
  const recent    = JSON.parse(
    localStorage.getItem('recentRecipients') || '[]'
  );
  const container = document.getElementById('recentRecipients');

  if(recent.length === 0){
    container.innerHTML = `
      <p style="color:#64748b; font-size:14px; text-align:center;">
        No recent recipients yet
      </p>`;
    return;
  }

  container.innerHTML = '';
  recent.slice(0, 5).forEach(r => {
    const initials = r.name
      ? r.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : r.account.slice(0, 2).toUpperCase();

    const div = document.createElement('div');
    div.className = 'recipient-item';
    div.innerHTML = `
      <div class="recipient-avatar">${initials}</div>
      <div class="recipient-info">
        <strong>${r.name || 'Unknown'}</strong>
        <small>${r.account}</small>
      </div>
      <button class="quick-transfer-btn"
        onclick="transferToRecipient('${r.name}', '${r.account}')">
        Transfer
      </button>`;
    container.appendChild(div);
  });
}

// ── SAVE RECENT RECIPIENT ─────────────────────────────────────
function saveRecentRecipient(name, account) {
  const recent   = JSON.parse(
    localStorage.getItem('recentRecipients') || '[]'
  );
  const filtered = recent.filter(r => r.account !== account);
  filtered.unshift({ name, account });
  localStorage.setItem(
    'recentRecipients',
    JSON.stringify(filtered.slice(0, 5))
  );
}

// ── HANDLE TRANSFER ───────────────────────────────────────────
async function handleTransfer(e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  const toAccountNumber = document.getElementById('receiverAccount').value.trim();
  const receiverName    = document.getElementById('receiverName').value.trim();
  const amount          = parseFloat(document.getElementById('amount').value);
  const description     = document.getElementById('remark').value.trim();
  const pin             = document.getElementById('confirmPin').value;

  // ── Validations ───────────────────────────────────────────

  if(!toAccountNumber){
    alert('❌ Please enter receiver account number.');
    return;
  }

  if(!validateAccountNumber(toAccountNumber)){
    alert('❌ Invalid account number!\nMust be 10 to 16 characters.\nLetters and numbers allowed.\nExample: HB511139824 or 12345678901');
    return;
  }

  if(!amount || amount <= 0){
    alert('❌ Amount must be greater than 0.');
    return;
  }

  if(amount > 500000){
    alert('❌ Daily transfer limit is ₹5,00,000.');
    return;
  }

  if(!pin){
    alert('❌ Please enter your PIN to authorize transfer.');
    return;
  }

  if(pin.length !== 4 || !/^\d{4}$/.test(pin)){
    alert('❌ PIN must be exactly 4 digits.');
    return;
  }

  // ── Confirm popup ─────────────────────────────────────────
  const fee   = amount > 100000 ? 50 : 0;
  const total = amount + fee;

  const confirmMsg =
    `Confirm Transfer:\n\n` +
    `To:           ${receiverName || 'Unknown'}\n` +
    `Account:      ${toAccountNumber}\n` +
    `Amount:       ₹${amount.toLocaleString()}\n` +
    `Fee:          ${fee === 0 ? 'FREE' : '₹' + fee}\n` +
    `Total Debit:  ₹${total.toLocaleString()}\n` +
    `PIN:          ✅ Verified\n\n` +
    `Proceed?`;

  if(!confirm(confirmMsg)) return;

  // ── Disable button ────────────────────────────────────────
  const btn = document.getElementById('transferBtn');
  if(btn){
    btn.disabled    = true;
    btn.textContent = '⏳ Processing...';
  }

  try {
    const res = await fetch('http://localhost:5000/api/account/transfer', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        toAccountNumber,
        amount,
        description: description || `Transfer to ${toAccountNumber}`,
      })
    });

    const data = await res.json();

    if(data.success){
      // Save to recent recipients
      saveRecentRecipient(receiverName || 'Unknown', toAccountNumber);

      alert(
        `✅ Transfer Successful!\n\n` +
        `Amount:      ₹${amount.toLocaleString()}\n` +
        `To:          ${toAccountNumber}\n` +
        `New Balance: ₹${data.newBalance.toLocaleString()}`
      );

      document.getElementById('transferForm').reset();
      updateSummary();
      window.location.href = 'dashboard.html';

    } else {
      alert('❌ Transfer failed: ' + data.message);
    }

  } catch(err) {
    console.log('Transfer error:', err);
    alert('❌ Cannot connect to server.\nMake sure backend is running on port 5000.');
  } finally {
    if(btn){
      btn.disabled    = false;
      btn.textContent = '💸 Send Money Now';
    }
  }
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
  loadBalance();
  loadRecentRecipients();

  document.getElementById('modeToggle')
    .addEventListener('click', toggleMode);
  initSidebarToggle();

  // Transfer form submit
  document.getElementById('transferForm')
    .addEventListener('submit', handleTransfer);

  // Update summary on amount change
  document.getElementById('amount')
    .addEventListener('input', updateSummary);
  document.getElementById('transferType')
    .addEventListener('change', updateSummary);

  // Initial summary
  updateSummary();

  // Fix logout link
  const logoutLink = document.querySelector('a[href="index.html"]');
  if(logoutLink){
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});
