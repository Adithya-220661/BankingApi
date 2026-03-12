// Sidebar toggle
function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (toggle) {
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

// Dark mode toggle
function toggleMode() {
  document.body.classList.toggle('dark-mode');
  const enabled = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', enabled);
  document.getElementById('modeToggle').textContent = enabled ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

// Restore dark mode from localStorage
function restoreMode() {
  const dark = localStorage.getItem('darkMode') === 'true';
  if (dark) document.body.classList.add('dark-mode');
  document.getElementById('modeToggle').textContent = dark ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

// Filter functionality
function applyFilters() {
  const dateFilter = document.getElementById('dateFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  const rows = document.querySelectorAll('#historyTable tbody tr');

  rows.forEach(row => {
    let show = true;

    // Date filter
    if (dateFilter !== 'all') {
      const dateCell = row.cells[0].textContent;
      const rowDate = new Date(dateCell.split(' ')[0]);
      const now = new Date();

      switch (dateFilter) {
        case 'today':
          show = rowDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          show = rowDate >= weekAgo;
          break;
        case 'month':
          show = rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();
          break;
        case 'year':
          show = rowDate.getFullYear() === now.getFullYear();
          break;
      }
    }

    // Type filter
    if (show && typeFilter !== 'all') {
      const typeCell = row.cells[1].textContent.toLowerCase();
      show = typeCell.includes(typeFilter);
    }

    // Status filter
    if (show && statusFilter !== 'all') {
      const statusCell = row.cells[5].textContent.toLowerCase();
      show = statusCell.includes(statusFilter);
    }

    row.style.display = show ? '' : 'none';
  });

  updateStats();
}

// Update statistics
function updateStats() {
  const visibleRows = Array.from(document.querySelectorAll('#historyTable tbody tr'))
    .filter(row => row.style.display !== 'none');

  let totalCredits = 0;
  let totalDebits = 0;
  let successCount = 0;

  visibleRows.forEach(row => {
    const amountText = row.cells[4].textContent;
    const amount = parseFloat(amountText.replace(/[₹,+]/g, ''));
    const status = row.cells[5].textContent.toLowerCase();

    if (amountText.includes('+')) {
      totalCredits += amount;
    } else {
      totalDebits += amount;
    }

    if (status.includes('success')) {
      successCount++;
    }
  });

  const successRate = visibleRows.length > 0 ? ((successCount / visibleRows.length) * 100).toFixed(1) : 0;

  document.getElementById('totalTransactions').textContent = visibleRows.length;
  document.getElementById('totalCredits').textContent = `₹${totalCredits.toLocaleString('en-IN')}`;
  document.getElementById('totalDebits').textContent = `₹${totalDebits.toLocaleString('en-IN')}`;
  document.getElementById('successRate').textContent = `${successRate}%`;
}

// View transaction details
function viewDetails(reference) {
  // Mock transaction details - in a real app, this would fetch from API
  const mockDetails = {
    'SAL20260310': {
      title: 'Salary Credit',
      amount: '+₹50,000.00',
      date: '2026-03-10 14:30:25',
      description: 'Monthly salary from TechCorp Inc',
      reference: 'SAL20260310',
      status: 'Success',
      bankRef: 'TXN20260310143025',
      balance: '₹1,25,000.00'
    },
    'TXN20260309': {
      title: 'Grocery Shopping',
      amount: '-₹2,450.00',
      date: '2026-03-09 11:15:42',
      description: 'Purchase at BigMart Superstore',
      reference: 'TXN20260309',
      status: 'Success',
      bankRef: 'TXN20260309111542',
      balance: '₹75,000.00'
    }
  };

  const details = mockDetails[reference];
  if (details) {
    alert(`Transaction Details:\n\n${details.title}\nAmount: ${details.amount}\nDate: ${details.date}\nDescription: ${details.description}\nReference: ${details.reference}\nStatus: ${details.status}\nBank Reference: ${details.bankRef}\nAvailable Balance: ${details.balance}`);
  } else {
    alert('Transaction details not available for this reference.');
  }
}

// Export functionality
function exportHistory() {
  const visibleRows = Array.from(document.querySelectorAll('#historyTable tbody tr'))
    .filter(row => row.style.display !== 'none');

  let csvContent = 'Date & Time,Type,Description,Reference,Amount,Status\n';

  visibleRows.forEach(row => {
    const cells = Array.from(row.cells).slice(0, 6); // Exclude actions column
    const rowData = cells.map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(',');
    csvContent += rowData + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `transaction_history_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Pagination
let currentPage = 1;
const rowsPerPage = 10;

function changePage(direction) {
  const table = document.getElementById('historyTable');
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  if (direction === 'next' && currentPage < totalPages) {
    currentPage++;
  } else if (direction === 'prev' && currentPage > 1) {
    currentPage--;
  }

  showPage(currentPage, rows);
  updatePaginationButtons(totalPages);
}

function showPage(page, rows) {
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  rows.forEach((row, index) => {
    if (index >= startIndex && index < endIndex) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function updatePaginationButtons(totalPages) {
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  initSidebarToggle();
  restoreMode();

  // Add event listeners
  document.getElementById('modeToggle').addEventListener('click', toggleMode);

  // Initialize pagination
  const rows = Array.from(document.querySelectorAll('#historyTable tbody tr'));
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  showPage(1, rows);
  updatePaginationButtons(totalPages);

  // Update initial stats
  updateStats();
});