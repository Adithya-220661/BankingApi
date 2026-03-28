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
let trendsChart, regChart;

function toggleModeAdmin() {
  document.body.classList.toggle('dark-mode');
  const enabled = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', enabled);
  document.getElementById('modeToggleAdmin').textContent =
    enabled ? '☀︎ Light Mode' : '🌙 Dark Mode';
  updateChartsTheme(enabled);
}

function restoreMode() {
  const dark = localStorage.getItem('darkMode') === 'true';
  if(dark) document.body.classList.add('dark-mode');
  document.getElementById('modeToggleAdmin').textContent =
    dark ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

function getChartColors(isDarkMode) {
  return {
    text:       isDarkMode ? '#e2e8f0' : '#333',
    border:     isDarkMode ? '#334155' : '#cbd5e1',
    background: isDarkMode ? '#1e293b' : '#fff'
  };
}

// ── LOGOUT ────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// ── CHARTS ────────────────────────────────────────────────────
function createTrendsChart() {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = getChartColors(isDark);
  const ctx    = document.getElementById('trendsChart').getContext('2d');

  const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const volume = [850000,920000,780000,1100000,950000,1200000,1450000];

  if(trendsChart) trendsChart.destroy();
  trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Transaction Volume (₹)',
        data:  volume,
        borderColor:     '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth:  2,
        fill:         true,
        tension:      0.35,
        pointRadius:  3,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor:     colors.background,
        pointBorderWidth:     2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            color: colors.text,
            callback: v => '₹' + (v/100000).toFixed(1) + 'L'
          },
          grid: { color: colors.border }
        },
        x: {
          ticks: { color: colors.text },
          grid:  { color: colors.border }
        }
      }
    }
  });
}

function getLastMonths(count) {
  const months = [];
  const now = new Date();
  for(let i = count - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short' });
    months.push({ key, label, year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

function createRegistrationsChart(users) {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = getChartColors(isDark);
  const ctx    = document.getElementById('regChart').getContext('2d');

  const months = getLastMonths(6);
  const countsByKey = new Map(months.map(m => [m.key, 0]));

  (Array.isArray(users) ? users : []).forEach(u => {
    if(!u || !u.createdAt) return;
    const dt = new Date(u.createdAt);
    if(Number.isNaN(dt.getTime())) return;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if(countsByKey.has(key)){
      countsByKey.set(key, countsByKey.get(key) + 1);
    }
  });

  const labels = months.map(m => m.label);
  const data = months.map(m => countsByKey.get(m.key) || 0);

  if(regChart) regChart.destroy();
  regChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Registrations',
        data,
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: colors.text },
          grid:  { color: colors.border }
        },
        y: {
          ticks: { color: colors.text, precision: 0 },
          grid:  { color: colors.border },
          beginAtZero: true
        }
      }
    }
  });
}

function updateChartsTheme(isDarkMode) {
  const colors = getChartColors(isDarkMode);
  [trendsChart, regChart].forEach(chart => {
    if(chart){
      const legend = chart.options && chart.options.plugins && chart.options.plugins.legend;
      if(legend && legend.labels) legend.labels.color = colors.text;
      if(chart.options.scales){
        Object.values(chart.options.scales).forEach(scale => {
          if(scale.ticks) scale.ticks.color = colors.text;
          if(scale.grid)  scale.grid.color  = colors.border;
        });
      }
      chart.update();
    }
  });
}

// ── POPULATE ADMIN DATA ───────────────────────────────────────
function populateAdminData(stats, users) {

  // Stats cards
  document.getElementById('totalUsers').textContent =
    stats.totalUsers;
  document.getElementById('totalBalance').textContent =
    `₹${stats.totalBalance.toLocaleString('en-IN')}`;
  document.getElementById('activeSessions').textContent =
    stats.activeUsers;
  document.getElementById('todayTransactions').textContent =
    stats.totalTransactions;

  // System overview
  document.getElementById('systemUptime').textContent  = '99.9%';
  document.getElementById('serverLoad').textContent    = '23%';
  document.getElementById('securityAlerts').textContent = '0';
  document.getElementById('pendingApprovals').textContent =
    stats.lockedUsers || '0';

  // Users table
  const tbody = document.getElementById('usersTable').querySelector('tbody');
  tbody.innerHTML = '';

  if(users.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; color:#64748b; padding:20px;">
          No users found
        </td>
      </tr>`;
    return;
  }

  users.forEach(u => {
    const tr          = document.createElement('tr');
    const statusClass = u.isActive ? 'status-active' : 'status-inactive';
    const statusLabel = u.isActive ? 'Active' : 'Locked';
    const lockLabel   = u.isActive ? '🔒 Lock' : '🔓 Unlock';

    tr.innerHTML = `
      <td><strong>${u.fullName}</strong></td>
      <td>${u.email}</td>
      <td><span class="balance-amount">₹${u.balance.toLocaleString('en-IN')}</span></td>
      <td>
        <span class="status-badge ${statusClass}">${statusLabel}</span>
      </td>
      <td>
        <button class="action-btn-small"
          onclick="viewUser('${u._id}')">👁️ View</button>
        <button class="action-btn-small ${u.isActive ? 'danger' : 'success'}"
          onclick="toggleLock('${u._id}', ${u.isActive})">
          ${lockLabel}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Charts (keep the UI compact and professional)
  if (typeof window.Chart === 'function') {
    createTrendsChart();
    createRegistrationsChart(users);
  } else {
    showChartsUnavailableNote();
  }
}

// ── VIEW USER ─────────────────────────────────────────────────
async function viewUser(userId) {
  const token = localStorage.getItem('token');

  try {
    const res  = await fetch(
      `http://localhost:5000/api/admin/users/${userId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();

    if(data.success){
      const u = data.user;
      alert(
        `User Details:\n\n` +
        `Name:           ${u.fullName}\n` +
        `Email:          ${u.email}\n` +
        `Phone:          ${u.phone}\n` +
        `Username:       ${u.username}\n` +
        `Account No:     ${u.accountNumber}\n` +
        `Balance:        ₹${u.balance.toLocaleString()}\n` +
        `KYC Verified:   ${u.kycVerified ? 'Yes' : 'No'}\n` +
        `Status:         ${u.isActive ? 'Active' : 'Locked'}\n` +
        `Joined:         ${new Date(u.createdAt).toLocaleDateString('en-IN')}`
      );
    } else {
      alert('Failed to load user details.');
    }
  } catch(err) {
    alert('Cannot connect to server.');
  }
}

// ── TOGGLE LOCK / UNLOCK ──────────────────────────────────────
async function toggleLock(userId, isCurrentlyActive) {
  const token  = localStorage.getItem('token');
  const action = isCurrentlyActive ? 'lock' : 'unlock';

  if(!confirm(`Are you sure you want to ${action} this account?`)) return;

  try {
    const res  = await fetch(
      `http://localhost:5000/api/admin/users/${userId}/lock`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await res.json();

    if(data.success){
      alert(`✅ Account ${action}ed successfully!`);
      loadAdminData(); // Refresh page
    } else {
      alert('❌ Failed: ' + data.message);
    }
  } catch(err) {
    alert('Cannot connect to server.');
  }
}

// ── EXPORT REPORT ─────────────────────────────────────────────
async function exportData() {
  const token = localStorage.getItem('token');

  try {
    const res  = await fetch(
      'http://localhost:5000/api/admin/users',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();

    if(!data.success) return;

    let csv = 'Name,Email,Phone,Account Number,Balance,Status,Joined\n';
    data.users.forEach(u => {
      csv += `"${u.fullName}","${u.email}","${u.phone}","${u.accountNumber}","${u.balance}","${u.isActive ? 'Active' : 'Locked'}","${new Date(u.createdAt).toLocaleDateString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(blob);
    link.setAttribute('download', `users_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('✅ Report exported successfully!');
  } catch(err) {
    alert('Cannot connect to server.');
  }
}

// ── ADD NEW USER ──────────────────────────────────────────────
function addNewUser() {
  window.location.href = 'registration.html';
}

// ── SYSTEM SETTINGS ───────────────────────────────────────────
function systemSettings() {
  alert('⚙️ System Settings coming soon!');
}

// ── LOAD ADMIN DATA FROM BACKEND ─────────────────────────────
async function loadAdminData(){

  const token = localStorage.getItem('token');

  console.log("Dashboard token:", token);

  if(!token){
    alert("Session expired. Please login again.");
    window.location.href = "admin-login.html";
    return;
  }

  try{

    // ===== STATS API =====
    const statsRes = await fetch(
      "http://localhost:5000/api/admin/stats",
      {
        headers:{
          "Authorization": "Bearer " + token
        }
      }
    );

    console.log("Stats response status:", statsRes.status);

    if(statsRes.status === 401 || statsRes.status === 403){

      console.log("Token rejected by backend");

      alert("Session expired. Please login again.");
      localStorage.clear();

      setTimeout(()=>{
        window.location.href = "admin-login.html";
      },800);

      return;
    }

    const statsData = await statsRes.json();

    console.log("Stats API:", statsData);

    if(statsData.success !== true){

      console.log("Stats success false:", statsData.message);

      alert(statsData.message || "Admin validation failed.");
      localStorage.clear();

      setTimeout(()=>{
        window.location.href = "admin-login.html";
      },800);

      return;
    }

    // ===== USERS API =====
    const usersRes = await fetch(
      "http://localhost:5000/api/admin/users",
      {
        headers:{
          "Authorization": "Bearer " + token
        }
      }
    );

    console.log("Users response status:", usersRes.status);

    if(usersRes.status === 401 || usersRes.status === 403){

      alert("Session expired while loading users.");
      localStorage.clear();

      setTimeout(()=>{
        window.location.href = "admin-login.html";
      },800);

      return;
    }

    const usersData = await usersRes.json();

    console.log("Users API:", usersData);

    // ===== SUCCESS =====
    populateAdminData(statsData.stats, usersData.users || []);

    console.log("✅ Dashboard Loaded Successfully");

  }
  catch(err){
    console.log("Dashboard Network Error:", err);
    alert("Cannot connect to backend server.");
  }
}
// ── ON PAGE LOAD ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if(!token){
  alert('Session expired. Please login again.');
  window.location.href = 'admin-login.html';
  return;
}

  restoreMode();
  initSidebarToggle();

  const modeToggle = document.getElementById('modeToggleAdmin');
  if (modeToggle) modeToggle.addEventListener('click', toggleModeAdmin);

  loadAdminData();
});

function showChartsUnavailableNote() {
  if (typeof window.Chart === 'function') return;

  document.querySelectorAll('.chart-card').forEach(card => {
    if (card.querySelector('.chart-fallback-note')) return;
    const note = document.createElement('div');
    note.className = 'chart-fallback-note';
    note.textContent = 'Charts are unavailable (Chart.js failed to load).';
    card.appendChild(note);
  });
}

function exportData() {
  const rows = Array.from(document.querySelectorAll('#usersTable tbody tr'));
  if (!rows.length) return alert('No user data to export.');

  let csv = 'Name,Email,Balance,Status\n';
  rows.forEach(row => {
    const cells = Array.from(row.cells).slice(0, 4).map(c => `"${c.textContent.replace(/"/g, '""')}"`);
    csv += `${cells.join(',')}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `admin_report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function addNewUser() {
  const name = prompt('Enter user name:');
  if (!name) return;
  const email = prompt('Enter email:');
  if (!email) return;
  const balanceRaw = prompt('Enter balance:', '0');
  const balance = Number(balanceRaw);
  const status = confirm('Set status as Active?') ? 'Active' : 'Inactive';
  dummyUsers.push({ name, email, balance: Number.isFinite(balance) ? balance : 0, status });

  try {
    populateAdminData(dummyUsers);
  } catch (e) {
    console.error(e);
    showChartsUnavailableNote();
  }
}

function systemSettings() {
  alert('Settings screen is not implemented yet.');
}
async function handleLogin() {
  // Get form values
  const adminId = document.getElementById('adminId').value.trim();
  const password = document.getElementById('adminPassword').value.trim();
  const bankId = document.getElementById('bankId').value.trim();
  const captchaInput = document.getElementById('captchaInput').value.trim().toUpperCase();
  const captchaText = document.getElementById('captchaText').textContent.trim();

  // Clear previous messages
  clearMessages();

  // Validation
  if (!adminId || !password || !bankId) {
    showError('Please fill in all fields.');
    return;
  }
  if (captchaInput !== captchaText) {
    showError('❌ Incorrect captcha. Please try again.');
    generateCaptcha();
    return;
  }

  // Loading state
  const loginBtn = document.getElementById('loginBtn');
  const originalText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.textContent = '⏳ Logging in...';

  console.log('Login attempt:', { adminId: adminId.substring(0, 4) + '...', bankId });

  try {
    const res = await fetch('http://localhost:5000/api/admin-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, password, bankId })
    });

    console.log('Response status:', res.status, 'ok:', res.ok);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('HTTP error:', res.status, errorText);
      showError(`Server error (${res.status}): ${errorText}`);
      return;
    }

    const data = await res.json();
    console.log('Response data:', data);

    if (data.success) {
      // Store tokens and role
      // localStorage.setItem('token', data.token);
      // localStorage.setItem('user', JSON.stringify(data.user)); // backward compatibility
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.admin));

      
      // Store user info if available
      if (data.admin || data.user) {
        const userInfo = {
          ... (data.admin || data.user),
          role: 'admin'
        };
        localStorage.setItem('adminUser', JSON.stringify(userInfo));
        localStorage.setItem('user', JSON.stringify(userInfo));
      }


    } else {
      showError(data.message || 'Login failed. Please check your credentials.');
      if (data.attemptsLeft !== undefined) {
        document.getElementById('attemptsWarn').textContent = 
          `⚠️ ${data.attemptsLeft} attempt${data.attemptsLeft !== 1 ? 's' : ''} remaining before lockout.`;
        document.getElementById('attemptsWarn').classList.add('show');
      }
    }

  } catch (error) {
    console.error('Network error:', error);
    showError('❌ Cannot connect to server. Please ensure backend is running on http://localhost:5000');
  } finally {
    // Reset button
    loginBtn.disabled = false;
    loginBtn.textContent = originalText;
    generateCaptcha(); // Refresh captcha
  }
}

function showError(message) {
  const el = document.getElementById('errorMsg');
  el.textContent = message;
  el.classList.add('show');
}

function showSuccess(message) {
  const el = document.getElementById('successMsg');
  el.textContent = message;
  el.classList.add('show');
}

function clearMessages() {
  ['errorMsg', 'successMsg', 'attemptsWarn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
}

function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let captcha = '';
  for (let i = 0; i < 5; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('captchaText').textContent = captcha;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  generateCaptcha();
});
