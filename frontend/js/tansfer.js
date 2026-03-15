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

// Update transfer summary in real-time
function updateSummary() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const fee = amount > 100000 ? 50 : 0; // Flat fee for amounts > 1 lakh
  const total = amount + fee;
  
  document.getElementById('summaryAmount').textContent = `₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('summaryFee').textContent = fee === 0 ? 'FREE' : `₹${fee}`;
  document.getElementById('summaryTotal').textContent = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

// Validate account number
function validateAccountNumber(account) {
  return /^\d{12,16}$/.test(account.replace(/\s/g, ''));
}

// Handle form submission
document.getElementById('transferForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const receiverAccount = document.getElementById('receiverAccount').value.trim();
  const receiverName = document.getElementById('receiverName').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const password = document.getElementById('password').value;
  
  // Validation
  if (!receiverAccount) {
    alert('❌ Please enter receiver account number');
    return;
  }
  
  if (!validateAccountNumber(receiverAccount)) {
    alert('❌ Invalid account number. Must be 12-16 digits.');
    return;
  }
  
  if (amount <= 0) {
    alert('❌ Amount must be greater than 0');
    return;
  }
  
  if (amount > 500000) {
    alert('❌ Daily transfer limit is ₹5,00,000');
    return;
  }
  
  if (!password) {
    alert('❌ Please enter your password for security verification');
    return;
  }
  
  // Process transfer
  const fee = amount > 100000 ? 50 : 0;
  const total = amount + fee;
  
  const confirmMsg = `Confirm Transfer:\n\nTo: ${receiverName || 'Unknown'}\nAccount: ${receiverAccount}\nAmount: ₹${amount.toLocaleString()}\nFee: ₹${fee}\nTotal Debit: ₹${total.toLocaleString()}\n\nProceed?`;
  
  if (confirm(confirmMsg)) {
    // Simulate processing
    alert(`✅ Transfer Successful!\n\nAmount: ₹${amount.toLocaleString()}\nTo: ${receiverAccount}\nTransaction Reference: TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}\n\nThe amount will be credited within 1-2 working days.`);
    
    // Reset form
    document.getElementById('transferForm').reset();
    updateSummary();
  }
});

// Helper function for quick transfers
function transferToRecipient(name, account) {
  document.getElementById('receiverName').value = name;
  document.getElementById('receiverAccount').value = account;
  document.getElementById('receiverAccount').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  restoreMode();
  document.getElementById('modeToggle').addEventListener('click', toggleMode);
  initSidebarToggle();
  
  // Update summary on amount change
  document.getElementById('amount').addEventListener('input', updateSummary);
  document.getElementById('transferType').addEventListener('change', updateSummary);
  
  // Initial summary update
  updateSummary();
});