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
let balanceChart, statusChart, trendsChart;

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
function createBalanceChart(users) {
  const isDark  = document.body.classList.contains('dark-mode');
  const colors  = getChartColors(isDark);
  const ctx     = document.getElementById('balanceChart').getContext('2d');

  if(balanceChart) balanceChart.destroy();
  balanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: users.map(u => u.fullName),
      datasets: [{
        data: users.map(u => u.balance),
        backgroundColor: [
          '#3b82f6','#10b981','#f59e0b',
          '#ef4444','#8b5cf6','#06b6d4',
          '#ec4899','#84cc16'
        ],
        borderColor:  colors.background,
        borderWidth:  3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: colors.text, font: { size: 12 } }
        }
      }
    }
  });
}

function createStatusChart(activeCount, lockedCount) {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = getChartColors(isDark);
  const ctx    = document.getElementById('statusChart').getContext('2d');

  if(statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Active', 'Locked'],
      datasets: [{
        label: 'Users',
        data:  [activeCount, lockedCount],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor:     colors.border,
        borderWidth:     1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: colors.text } }
      },
      scales: {
        x: {
          ticks: { color: colors.text },
          grid:  { color: colors.border }
        },
        y: {
          ticks: { color: colors.text },
          grid:  { color: colors.border }
        }
      }
    }
  });
}

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
        borderWidth:  3,
        fill:         true,
        tension:      0.4,
        pointRadius:  5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor:     colors.background,
        pointBorderWidth:     2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: colors.text } }
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

function updateChartsTheme(isDarkMode) {
  const colors = getChartColors(isDarkMode);
  [balanceChart, statusChart, trendsChart].forEach(chart => {
    if(chart){
      chart.options.plugins.legend.labels.color = colors.text;
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

  // Charts
  createBalanceChart(users);
  createStatusChart(stats.activeUsers, stats.lockedUsers);
  createTrendsChart();
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
async function loadAdminData() {
  const token = localStorage.getItem('token');
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  try {
    // Fetch stats
    const statsRes = await fetch(
      'http://localhost:5000/api/admin/stats',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const statsData = await statsRes.json();

    if(!statsData.success){
      alert('Admin access required. Please login as admin.');
      window.location.href = 'index.html';
      return;
    }

    // Fetch all users
    const usersRes = await fetch(
      'http://localhost:5000/api/admin/users',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const usersData = await usersRes.json();

    const users = usersData.success ? usersData.users : [];

    // Populate admin dashboard
    populateAdminData(statsData.stats, users);

  } catch(err) {
    console.log('Admin error:', err);
    alert('Cannot connect to server. Make sure backend is running.');
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

  restoreMode();
  loadAdminData();
  document.getElementById('modeToggleAdmin')
    .addEventListener('click', toggleModeAdmin);
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