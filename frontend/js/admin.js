// sidebar toggle functionality
function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
    
    // close sidebar when clicking on a link
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
      });
    });
  }
}

// store chart instances to update on dark mode toggle
let balanceChart, statusChart, trendsChart;

function toggleModeAdmin() {
  document.body.classList.toggle('dark-mode');
  const enabled = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', enabled);
  document.getElementById('modeToggleAdmin').textContent = enabled ? '☀︎ Light Mode' : '🌙 Dark Mode';
  
  // update charts for dark mode
  updateChartsTheme(enabled);
}

function getChartColors(isDarkMode) {
  return {
    text: isDarkMode ? '#e2e8f0' : '#333',
    border: isDarkMode ? '#334155' : '#cbd5e1',
    background: isDarkMode ? '#1e293b' : '#fff'
  };
}

function createBalanceChart(data) {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = getChartColors(isDark);
  const ctx = document.getElementById('balanceChart').getContext('2d');
  
  if (balanceChart) balanceChart.destroy();
  balanceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(u => u.name),
      datasets: [{
        data: data.map(u => u.balance),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderColor: colors.background,
        borderWidth: 3
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

function createStatusChart(data) {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = getChartColors(isDark);
  const active = data.filter(u => u.status === 'Active').length;
  const inactive = data.filter(u => u.status === 'Inactive').length;
  const ctx = document.getElementById('statusChart').getContext('2d');
  
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Active', 'Inactive'],
      datasets: [{
        label: 'Users',
        data: [active, inactive],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: colors.border,
        borderWidth: 1
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
          grid: { color: colors.border }
        },
        y: {
          ticks: { color: colors.text },
          grid: { color: colors.border }
        }
      }
    }
  });
}

function createTrendsChart() {
  const isDark = document.body.classList.contains('dark-mode');
  const colors = getChartColors(isDark);
  const ctx = document.getElementById('trendsChart').getContext('2d');
  
  // sample transaction data for last 7 days
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const transactions = [45, 52, 48, 61, 55, 67, 72];
  const volume = [850000, 920000, 780000, 1100000, 950000, 1200000, 1450000];
  
  if (trendsChart) trendsChart.destroy();
  trendsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Transaction Volume (₹)',
        data: volume,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: colors.background,
        pointBorderWidth: 2
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
            callback: (v) => '₹' + (v/100000).toFixed(1) + 'L'
          },
          grid: { color: colors.border }
        },
        x: {
          ticks: { color: colors.text },
          grid: { color: colors.border }
        }
      }
    }
  });
}

function updateChartsTheme(isDarkMode) {
  const colors = getChartColors(isDarkMode);
  
  [balanceChart, statusChart, trendsChart].forEach(chart => {
    if (chart) {
      chart.options.plugins.legend.labels.color = colors.text;
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale.ticks) scale.ticks.color = colors.text;
          if (scale.grid) scale.grid.color = colors.border;
        });
      }
      chart.update();
    }
  });
}

function populateAdminData(users) {
  document.getElementById('totalUsers').textContent = users.length;
  const totalBalance = users.reduce((sum,u) => sum + u.balance, 0);
  document.getElementById('totalBalance').textContent = `₹${totalBalance.toLocaleString()}`;
  document.getElementById('activeSessions').textContent = users.filter(u=>u.status==='Active').length;
  document.getElementById('todayTransactions').textContent = Math.floor(Math.random() * 50) + 20;

  // System overview data
  document.getElementById('systemUptime').textContent = '99.9%';
  document.getElementById('serverLoad').textContent = '23%';
  document.getElementById('securityAlerts').textContent = '0';
  document.getElementById('pendingApprovals').textContent = '3';

  // populate table
  const tbody = document.getElementById('usersTable').querySelector('tbody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    const statusClass = u.status === 'Active' ? 'status-active' : 'status-inactive';
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td><span class="balance-amount">₹${u.balance.toLocaleString()}</span></td>
      <td><span class="status-badge ${statusClass}">${u.status}</span></td>
      <td>
        <button class="action-btn-small" onclick="viewUser('${u.email}')">👁️</button>
        <button class="action-btn-small" onclick="editUser('${u.email}')">✏️</button>
        <button class="action-btn-small danger" onclick="deleteUser('${u.email}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // create charts
  createBalanceChart(users);
  createStatusChart(users);
  createTrendsChart();
}

function viewUser(email) {
  alert(`👁️ Viewing user details for: ${email}`);
}

function editUser(email) {
  alert(`✏️ Editing user: ${email}`);
}

function deleteUser(email) {
  if (confirm(`🗑️ Are you sure you want to delete user: ${email}?`)) {
    alert('User deleted successfully!');
  }
}

function restoreMode() {
  const dark = localStorage.getItem('darkMode') === 'true';
  if (dark) document.body.classList.add('dark-mode');
  document.getElementById('modeToggleAdmin').textContent = dark ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

const dummyUsers = [
  {name:'John Doe', email:'john@example.com', balance:52340, status:'Active'},
  {name:'Jane Smith', email:'jane@example.com', balance:12000, status:'Inactive'},
  {name:'Samuel Green', email:'samuel@example.com', balance:7500, status:'Active'},
  {name:'Emily Brown', email:'emily@example.com', balance:35680, status:'Active'},
  {name:'Michael Red', email:'michael@example.com', balance:18900, status:'Inactive'}
];

window.addEventListener('DOMContentLoaded', () => {
  restoreMode();
  populateAdminData(dummyUsers);
  document.getElementById('modeToggleAdmin').addEventListener('click', toggleModeAdmin);
  initSidebarToggle();
});