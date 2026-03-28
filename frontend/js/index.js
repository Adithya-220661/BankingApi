// ═══════════════════════════════════════════════════
//  ACCESSIBILITY
// ═══════════════════════════════════════════════════
function toggleAccessibilityMenu() {
    document.getElementById("accMenu").classList.toggle("active");
}

let baseFontSize = 100;
function changeFontSize(action) {
    if (action === 'plus') baseFontSize += 10;
    else baseFontSize -= 10;
    document.body.style.fontSize = baseFontSize + "%";
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode-active");
    if (document.body.classList.contains("dark-mode-active")) {
        document.body.style.background = "#000000";
        document.body.style.color      = "#ffffff";
        document.querySelector(".bank-navbar").style.background = "#ffffff";
    } else {
        document.body.style.background = "";
        document.body.style.color      = "";
        document.querySelector(".bank-navbar").style.background = "#ffffff";
    }
}

// ═══════════════════════════════════════════════════
//  MODAL OPEN / CLOSE
// ═══════════════════════════════════════════════════
function openLogin() {
    document.getElementById("loginModal").style.display = "flex";
}

function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
    clearLockoutTimer();
}

function showCustomer() {
    document.getElementById("customerLogin").style.display = "block";
}

// ═══════════════════════════════════════════════════
//  LOCKOUT TIMER
// ═══════════════════════════════════════════════════
let lockoutInterval = null;

function clearLockoutTimer() {
    if (lockoutInterval) {
        clearInterval(lockoutInterval);
        lockoutInterval = null;
    }
}

function showLockoutMessage(remainingSec) {
    clearLockoutTimer();

    const loginBtn  = document.querySelector('#customerLogin .login-submit');
    const forgotPin = document.querySelector('#customerLogin .forgetpin');
    const lockMsg   = document.getElementById('lockoutMessage');

    if (loginBtn) {
        loginBtn.disabled      = true;
        loginBtn.style.opacity = '0.5';
        loginBtn.style.cursor  = 'not-allowed';
    }

    if (forgotPin) {
        forgotPin.style.color      = 'red';
        forgotPin.style.fontWeight = 'bold';
        forgotPin.style.fontSize   = '14px';
        forgotPin.textContent      = '🔑 Forgot Pin? Click here to recover access';
    }

    clearLoginFields();

    let seconds = remainingSec;

    function updateDisplay() {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (lockMsg) {
            lockMsg.style.display    = 'block';
            lockMsg.style.background = 'rgba(255,0,0,0.15)';
            lockMsg.style.color      = '#ff4444';
            lockMsg.style.border     = '1px solid red';
            lockMsg.innerHTML        = `
                🔒 Account locked. Try again in
                <strong>${mins}:${secs.toString().padStart(2, '0')}</strong>
                <br><small style="color:#ffcc00;">
                    Use Forgot PIN to recover access immediately.
                </small>
            `;
        }
    }

    updateDisplay();

    lockoutInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearLockoutTimer();
            unlockLoginForm();
        } else {
            updateDisplay();
        }
    }, 1000);
}

function unlockLoginForm() {
    const loginBtn  = document.querySelector('#customerLogin .login-submit');
    const forgotPin = document.querySelector('#customerLogin .forgetpin');
    const lockMsg   = document.getElementById('lockoutMessage');

    if (loginBtn) {
        loginBtn.disabled      = false;
        loginBtn.style.opacity = '1';
        loginBtn.style.cursor  = 'pointer';
    }
    if (forgotPin) {
        forgotPin.style.color      = 'yellowgreen';
        forgotPin.style.fontWeight = 'normal';
        forgotPin.style.fontSize   = 'small';
        forgotPin.textContent      = 'Forgot Pin';
    }
    if (lockMsg) {
        lockMsg.style.display = 'none';
        lockMsg.innerHTML     = '';
    }
    generateCaptcha('captchaText');
}

function showAttemptWarning(message) {
    const lockMsg = document.getElementById('lockoutMessage');
    if (lockMsg) {
        lockMsg.style.display    = 'block';
        lockMsg.style.background = 'rgba(255,80,80,0.2)';
        lockMsg.style.color      = '#ff6b6b';
        lockMsg.style.border     = '1px solid #ff6b6b';
        lockMsg.innerHTML        = message;
    }
}

function showCaptchaWarning(message) {
    const lockMsg = document.getElementById('lockoutMessage');
    if (lockMsg) {
        lockMsg.style.display    = 'block';
        lockMsg.style.background = 'rgba(255,200,0,0.2)';
        lockMsg.style.color      = '#ffcc00';
        lockMsg.style.border     = '1px solid #ffcc00';
        lockMsg.innerHTML        = message;
    }
}

function clearLoginFields() {
    const u = document.getElementById('username');
    const p = document.getElementById('password');
    const c = document.getElementById('captchaInput');
    if (u) u.value = '';
    if (p) p.value = '';
    if (c) c.value = '';
    generateCaptcha('captchaText');
    if (u) u.focus();
}

function hideWarning() {
    const lockMsg = document.getElementById('lockoutMessage');
    if (lockMsg) {
        lockMsg.style.display = 'none';
        lockMsg.innerHTML     = '';
    }
}

// ═══════════════════════════════════════════════════
//  DOM CONTENT LOADED
// ═══════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {

    const customerForm = document.getElementById("customerLogin");

    if (customerForm) {
        customerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const username     = document.getElementById('username').value.trim();
            const pin          = document.getElementById('password').value.trim();
            const captchaInput = document.getElementById('captchaInput').value.trim();
            const captchaText  = document.getElementById('captchaText').innerText.trim();

            if (!username) { showAttemptWarning('⚠️ Please enter your username.'); return; }
            if (!pin)      { showAttemptWarning('⚠️ Please enter your PIN.');      return; }
            if (pin.length < 4) { showAttemptWarning('⚠️ PIN must be 4 digits.'); return; }

            if (captchaInput !== captchaText) {
                showCaptchaWarning('⚠️ Invalid Captcha! Please enter the correct captcha.');
                document.getElementById('captchaInput').value = '';
                generateCaptcha('captchaText');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ username, pin })
                });
                const data = await response.json();

                console.log('Login response:', data);

                if (data.success) {
                    clearLockoutTimer();
                    unlockLoginForm();
                    hideWarning();

                    // ✅ FIXED — block staff from customer portal
                    if (data.user.role !== 'user') {
                        alert('⛔ Staff members must use the Bank Staff Portal.\n\nClick "Bank Staff Portal" link in the footer.');
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        return;
                    }

                    // ✅ Save token and redirect customer to dashboard
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    alert(`✅ Welcome back, ${data.user.fullName}!`);
                    window.location.href = 'dashboard.html';

                } else if (data.locked === true) {
                    showLockoutMessage(data.remainingSec);

                } else if (data.attemptsLeft !== undefined) {
                    showAttemptWarning(data.message);
                    clearLoginFields();

                } else {
                    clearLoginFields();
                    hideWarning();
                    const goRegister = window.confirm(
                        '❌ ' + data.message + '\n\nDo you want to create a new account?'
                    );
                    if (goRegister) window.location.href = 'registration.html';
                }

            } catch (err) {
                showAttemptWarning('❌ Cannot connect to server. Make sure backend is running on port 5000.');
            }
        });
    }

    generateCaptcha("captchaText");
});

// ═══════════════════════════════════════════════════
//  CAPTCHA GENERATOR
// ═══════════════════════════════════════════════════
function generateCaptcha(targetId) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let captcha = "";
    for (let i = 0; i < 5; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const el = document.getElementById(targetId);
    if (el) el.innerText = captcha;
}

// ═══════════════════════════════════════════════════
//  CLEAR FORM ON PAGE LOAD
// ═══════════════════════════════════════════════════
window.onload = function () {
    const customerLogin = document.getElementById("customerLogin");
    if (customerLogin) customerLogin.reset();
    generateCaptcha("captchaText");
};

// ═══════════════════════════════════════════════════
//  PASSWORD TOGGLE
// ═══════════════════════════════════════════════════
function togglePassword() {
    let pass = event.target.previousElementSibling;
    let eye  = event.target;
    if (pass.type === "password") {
        pass.type     = "text";
        eye.innerText = "🙉";
    } else {
        pass.type     = "password";
        eye.innerText = "🙈";
    }
}

// ═══════════════════════════════════════════════════
//  PRODUCT CARD SCROLL ANIMATION
// ═══════════════════════════════════════════════════
window.addEventListener('scroll', () => {
    const cards         = document.querySelectorAll('.product-card');
    const triggerBottom = window.innerHeight / 5 * 4;
    cards.forEach(card => {
        const cardTop = card.getBoundingClientRect().top;
        if (cardTop < triggerBottom) {
            card.style.opacity   = '1';
            card.style.transform = 'translateY(0)';
        }
    });
});

// ═══════════════════════════════════════════════════
//  LOGO SPLASH SCREEN
// ═══════════════════════════════════════════════════
window.addEventListener("load", function () {
    setTimeout(function () {
        const splash = document.getElementById("logoSplash");
        if (splash) splash.classList.add("fadeOut");
    }, 2500);
    setTimeout(function () {
        const splash = document.getElementById("logoSplash");
        if (splash) splash.style.display = "none";
    }, 4000);
});