// sidebar toggle functionality
function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  
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

// toggles dark/light mode and remembers preference in localStorage
function toggleMode() {
  document.body.classList.toggle('dark-mode');
  const enabled = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', enabled);
  document.getElementById('modeToggle').textContent = enabled ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

// populate dashboard with dummy/user data
function populateUserData(user) {
  document.getElementById('welcomeHeader').textContent = `Welcome, ${user.name}`;

  const stats = [
    {label: 'Account Balance', value: `₹${user.balance.toLocaleString()}`, icon: '💰'},
    {label: 'Account Number', value: user.account, icon: '🏦'},
    {label: 'Status', value: user.status, icon: '✅'}
  ];

  const container = document.getElementById('statsContainer');
  container.innerHTML = '';
  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'account-card';
    card.innerHTML = `<h3>${s.icon} ${s.label}</h3><h1>${s.value}</h1>`;
    container.appendChild(card);
  });

  // Add additional stat cards
  const additionalStats = [
    {label: 'Monthly Income', value: `₹${user.monthlyIncome.toLocaleString()}`, icon: '📈', color: '#10b981'},
    {label: 'Monthly Expenses', value: `₹${user.monthlyExpenses.toLocaleString()}`, icon: '📉', color: '#ef4444'},
    {label: 'Savings Goal', value: `${user.savingsProgress}%`, icon: '🎯', color: '#f59e0b', progress: user.savingsProgress}
  ];

  additionalStats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <h3>${s.icon} ${s.label}</h3>
      <h1 style="color: ${s.color}">${s.value}</h1>
      ${s.progress ? `<div class="progress-bar"><div class="progress-fill" style="width: ${s.progress}%"></div></div>` : ''}
    `;
    container.appendChild(card);
  });

  const txnBody = document.getElementById('txnTable').querySelector('tbody');
  txnBody.innerHTML = '';
  user.transactions.forEach(txn => {
    const tr = document.createElement('tr');
    tr.className = txn.type || 'neutral';
    tr.innerHTML = `<td>${txn.date}</td><td>${txn.desc}</td><td class="amount ${txn.type}">${txn.amount}</td>`;
    txnBody.appendChild(tr);
  });
}

// restore mode from storage
function restoreMode() {
  const dark = localStorage.getItem('darkMode') === 'true';
  if (dark) document.body.classList.add('dark-mode');
  document.getElementById('modeToggle').textContent = dark ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

// example/fake data
const exampleUser = {
  name: 'John Doe',
  balance: 52340,
  account: 'XXXX 5678',
  status: 'Active',
  monthlyIncome: 55000,
  monthlyExpenses: 32000,
  savingsProgress: 75,
  transactions: [
    {date: '2026-03-01', desc: 'Grocery Store', amount: '-₹1,234', type: 'expense'},
    {date: '2026-02-28', desc: 'Salary Credit', amount: '+₹50,000', type: 'income'},
    {date: '2026-02-25', desc: 'Electricity Bill', amount: '-₹2,100', type: 'expense'},
    {date: '2026-02-20', desc: 'Freelance Payment', amount: '+₹5,000', type: 'income'},
    {date: '2026-02-15', desc: 'Restaurant', amount: '-₹850', type: 'expense'}
  ]
};

window.addEventListener('DOMContentLoaded', () => {
  restoreMode();
  populateUserData(exampleUser);
  document.getElementById('modeToggle').addEventListener('click', toggleMode);
  initSidebarToggle();
});