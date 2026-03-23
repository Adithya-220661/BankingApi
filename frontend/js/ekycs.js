function initSidebarToggle() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if(toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
    if(sidebar) {
      sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          document.body.classList.remove('sidebar-open');
        });
      });
    }
  }
}

function toggleMode() {
  document.body.classList.toggle('dark-mode');
  const enabled = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', enabled);
  const btn = document.getElementById('modeToggle');
  if(btn) btn.textContent = enabled ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

function restoreMode() {
  const stored = localStorage.getItem('darkMode');
  const dark = stored === null ? true : stored === 'true';
  if(stored === null) localStorage.setItem('darkMode', 'true');
  if(dark) document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');
  const btn = document.getElementById('modeToggle');
  if(btn) btn.textContent = dark ? '☀︎ Light Mode' : '🌙 Dark Mode';
}

let kycStream = null;

async function startKyc() {
  const video  = document.getElementById('ekycVideo');
  const circle = document.getElementById('ekycScanCircle');
  const status = document.getElementById('ekycStatus');
  const finish = document.getElementById('finishKycBtn');

  if(!video || !circle || !status) return;

  try {
    status.textContent = 'Initializing camera...';
    circle.classList.remove('detected');
    if(finish) finish.disabled = true;

    kycStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = kycStream;
    await video.play();

    status.textContent = 'Scanning face...';

    setTimeout(() => {
      if(!video.srcObject) return;
      circle.classList.add('detected');
      status.textContent = 'Face verified successfully!';
      if(finish) finish.disabled = false;
    }, 3000);
  } catch (err) {
    status.textContent = 'Camera error: please allow camera access.';
  }
}

function stopKyc() {
  const video  = document.getElementById('ekycVideo');
  if(video) video.srcObject = null;

  if(kycStream) {
    kycStream.getTracks().forEach(t => t.stop());
    kycStream = null;
  }
}

function finishKyc() {
  const circle = document.getElementById('ekycScanCircle');
  const status = document.getElementById('ekycStatus');
  if(circle && !circle.classList.contains('detected')) {
    alert('Please complete verification first.');
    return;
  }

  localStorage.setItem('ekycUpdatedAt', new Date().toISOString());
  if(status) status.textContent = 'E-KYC updated successfully.';

  stopKyc();
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if(!token){
    alert('Please login first.');
    window.location.href = 'index.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const adminLink = document.getElementById('adminLink');
  if(adminLink && user.role === 'admin'){
    adminLink.style.display = 'flex';
  }

  restoreMode();
  initSidebarToggle();

  const modeBtn = document.getElementById('modeToggle');
  if(modeBtn) modeBtn.addEventListener('click', toggleMode);

  const startBtn = document.getElementById('startKycBtn');
  const stopBtn = document.getElementById('stopKycBtn');
  const finishBtn = document.getElementById('finishKycBtn');
  if(startBtn) startBtn.addEventListener('click', startKyc);
  if(stopBtn) stopBtn.addEventListener('click', stopKyc);
  if(finishBtn) finishBtn.addEventListener('click', finishKyc);

  const logoutLink = document.querySelector('a[href="index.html"]');
  if(logoutLink){
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});
