
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


function initNotifications() {
  const panel = document.getElementById('notifPanel');
  const btn = document.getElementById('notifBtn');
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  const markReadBtn = document.getElementById('notifMarkRead');

  if(!panel || !btn || !list || !badge) return;

  const STORAGE_KEY = 'hb_notifications_v1';
  const DEMO_RESET_EACH_REFRESH = true;

  if(DEMO_RESET_EACH_REFRESH) {
    localStorage.removeItem(STORAGE_KEY);
  }

  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function loadNotifs() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeParse(raw, null);
    if(Array.isArray(data) && data.length) return data;

    const now = new Date().toISOString();
    const defaults = [
      {
        id: `welcome_${Date.now()}`,
        title: 'Welcome to Horizon',
        message: 'Thanks for banking with us. Your dashboard is ready.',
        createdAt: now,
        read: false
      },
      {
        id: `security_${Date.now() + 1}`,
        title: 'Security Tip',
        message: 'Never share your OTP or PIN. Our staff will never ask for it.',
        createdAt: now,
        read: false
      }
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  function saveNotifs(notifs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function render() {
    const notifs = loadNotifs();
    const unread = notifs.filter(n => !n.read).length;

    badge.textContent = String(unread);
    badge.hidden = unread === 0;

    list.innerHTML = '';

    const sorted = notifs
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    if(sorted.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notif-empty';
      empty.textContent = 'No notifications';
      list.appendChild(empty);
      return;
    }

    sorted.forEach(n => {
      const li = document.createElement('li');
      li.className = `notif-item${n.read ? ' read' : ''}`;
      li.setAttribute('data-id', n.id);
      li.innerHTML = `
        <div class="notif-item__titleRow">
          <div class="notif-item__title">${escapeHtml(n.title || 'Notification')}</div>
          <div class="notif-item__time">${escapeHtml(formatTime(n.createdAt))}</div>
        </div>
        <div class="notif-item__msg">${escapeHtml(n.message || '')}</div>
      `;
      li.addEventListener('click', () => {
        const all = loadNotifs();
        const idx = all.findIndex(x => x.id === n.id);
        if(idx >= 0) {
          all[idx].read = true;
          saveNotifs(all);
          render();
        }
      });
      list.appendChild(li);
    });
  }

  function openPanel() {
    render();
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    if(panel.hidden) openPanel();
    else closePanel();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel();
  });

  document.addEventListener('click', (e) => {
    if(panel.hidden) return;
    if(e.target === btn) return;
    if(panel.contains(e.target)) return;
    closePanel();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && !panel.hidden) closePanel();
  });

  if(markReadBtn) {
    markReadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const notifs = loadNotifs().map(n => ({ ...n, read: true }));
      saveNotifs(notifs);
      render();
    });
  }

  render();
  closePanel();
}


function populateUserData(user, transactions) {

  document.getElementById('welcomeHeader').textContent = 
    `Welcome, ${user.fullName}`;

  
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


function calculateTotal(transactions, type) {
  return transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}


function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}


function initLogoutConfirmation() {
  const modal = document.getElementById('logoutConfirm');
  if(!modal) return;

  function setHidden(hidden) {
    modal.hidden = hidden;
    modal.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function openModal() {
    setHidden(false);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setHidden(true);
    document.body.style.overflow = '';
  }

 
  const logoutLink = document.querySelector('a[href="index.html"]');
  if(logoutLink){
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  modal.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('[data-confirm-action]') : null;
    if(!btn) return;
    const action = btn.getAttribute('data-confirm-action');
    if(action === 'cancel') closeModal();
    if(action === 'logout') logout();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && !modal.hidden) closeModal();
  });

  closeModal();
}


async function loadDashboard() {
  const token = localStorage.getItem('token');

  
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  try {
    
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

    
    const txnRes = await fetch('http://localhost:5000/api/transactions?limit=5', {
      method:  'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const txnData = await txnRes.json();

    const transactions = txnData.success ? txnData.transactions : [];

    populateUserData(profileData.user, transactions);

  } catch(err) {
    console.log('Dashboard error:', err);
    alert('Cannot connect to server. Make sure backend is running.');
  }
}


window.addEventListener('DOMContentLoaded', () => {
  restoreMode();
  loadDashboard();
  document.getElementById('modeToggle').addEventListener('click', toggleMode);
  initSidebarToggle();
  initNotifications();
  initLogoutConfirmation();

});
