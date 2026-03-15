// Helper to update step dots
function updateDots(step) {
    document.getElementById('dot1').classList.remove('active');
    document.getElementById('dot2').classList.remove('active');
    document.getElementById('dot3').classList.remove('active');
    document.getElementById('dot' + step).classList.add('active');
}

// Helper to show a step
function showStep(stepId) {
    document.querySelectorAll('.step-box').forEach(box => {
        box.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

// ── STEP 1: SEND OTP ──────────────────────────────────────────
async function sendForgotOTP() {
    const phone = document.getElementById('fpPhone').value;

    if(!phone || phone.length !== 10){
        alert('Please enter valid 10-digit phone number.');
        return;
    }

    // Disable button to prevent double click
    const btn = document.querySelector('#fpStep1 .btn');
    if(btn){
        btn.disabled = true;
        btn.innerText = 'Sending...';
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/forgot-pin', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone })
        });
        const data = await res.json();

        if(data.success){
            // Show step 2
            showStep('fpStep2');
            updateDots(2);

            // Show OTP for testing
            const otpDisplay = document.getElementById('fpOtpDisplay');
            otpDisplay.innerText = `OTP for testing: ${data.otp_dev}`;

            // Auto fill OTP input
            document.getElementById('fpOtp').value = data.otp_dev;

        } else {
            alert('❌ ' + data.message);
            // Re-enable button
            if(btn){
                btn.disabled = false;
                btn.innerText = 'Send OTP';
            }
        }
    } catch(err) {
        alert('Backend not running! Start server first.');
        if(btn){
            btn.disabled = false;
            btn.innerText = 'Send OTP';
        }
    }
}

// ── STEP 2: VERIFY OTP ───────────────────────────────────────
// Just check OTP length and move to step 3
// Actual OTP verification happens in reset-pin
function verifyForgotOTP() {
    const otp = document.getElementById('fpOtp').value;

    if(!otp || otp.length !== 6){
        alert('Please enter complete 6-digit OTP.');
        return;
    }

    // Move to step 3
    showStep('fpStep3');
    updateDots(3);
}

// ── RESEND OTP ───────────────────────────────────────────────
let resendTimer = null;
let resendSeconds = 30;

async function resendForgotOTP() {
    const phone = document.getElementById('fpPhone').value;

    const resendBtn = document.getElementById('fpResendBtn');
    if(resendBtn){
        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/forgot-pin', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone })
        });
        const data = await res.json();

        if(data.success){
            // Show new OTP
            const otpDisplay = document.getElementById('fpOtpDisplay');
            otpDisplay.innerText = `New OTP: ${data.otp_dev}`;

            // Auto fill OTP
            document.getElementById('fpOtp').value = data.otp_dev;

            // Start countdown
            resendSeconds = 30;
            if(resendBtn) resendBtn.innerText = `Resend in ${resendSeconds}s`;

            clearInterval(resendTimer);
            resendTimer = setInterval(() => {
                resendSeconds--;
                if(resendBtn) resendBtn.innerText = `Resend in ${resendSeconds}s`;

                if(resendSeconds <= 0){
                    clearInterval(resendTimer);
                    if(resendBtn){
                        resendBtn.disabled = false;
                        resendBtn.style.opacity = '1';
                        resendBtn.innerText = 'Resend OTP';
                    }
                }
            }, 1000);

        } else {
            alert('❌ ' + data.message);
            if(resendBtn){
                resendBtn.disabled = false;
                resendBtn.style.opacity = '1';
            }
        }
    } catch(err) {
        alert('Backend not running! Start server first.');
        if(resendBtn){
            resendBtn.disabled = false;
            resendBtn.style.opacity = '1';
        }
    }
}

// ── STEP 3: RESET PIN ────────────────────────────────────────
async function resetPIN() {
    const phone      = document.getElementById('fpPhone').value;
    const otp        = document.getElementById('fpOtp').value;
    const newPin     = document.getElementById('fpNewPin').value;
    const confirmPin = document.getElementById('fpConfirmPin').value;

    // Validate PIN
    if(!newPin || newPin.length !== 4){
        alert('PIN must be exactly 4 digits.');
        return;
    }
    if(!/^\d{4}$/.test(newPin)){
        alert('PIN must contain only numbers.');
        return;
    }
    if(newPin !== confirmPin){
        alert('PINs do not match! Please try again.');
        document.getElementById('fpConfirmPin').value = '';
        return;
    }

    // Disable button
    const btn = document.querySelector('#fpStep3 .btn');
    if(btn){
        btn.disabled = true;
        btn.innerText = 'Resetting...';
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/reset-pin', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone, otp, newPin })
        });
        const data = await res.json();

        if(data.success){
            // Show success page
            showStep('fpSuccess');
        } else {
            alert('❌ ' + data.message);
            if(btn){
                btn.disabled = false;
                btn.innerText = 'Reset PIN';
            }
        }
    } catch(err) {
        alert('Backend not running! Start server first.');
        if(btn){
            btn.disabled = false;
            btn.innerText = 'Reset PIN';
        }
    }
}