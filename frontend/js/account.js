/**
 * GLOBAL VARIABLES
 */
let kycStream = null;
let resendTimer = null;
let resendSeconds = 30;

/**
 * SHARED HELPER — fills OTP boxes + shows OTP on page + copies to clipboard
 */
function fillOTPBoxes(otp) {
    const otpString = otp.toString();

    // Clear and fill OTP boxes
    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach(box => box.value = '');
    otpString.split('').forEach((char, i) => {
        if(boxes[i]) boxes[i].value = char;
    });

    // Show OTP on page
    const otpDisplay = document.getElementById('otpDisplay');
    if(otpDisplay){
        otpDisplay.innerText = `Your OTP is: ${otpString} (testing only)`;
    }

    // Auto copy to clipboard
    navigator.clipboard.writeText(otpString).catch(() => {});
}

/**
 * 1. NAVIGATION & ROADMAP LOGIC
 */
function nextStep(stepNumber) {
    const formSteps = document.querySelectorAll('.form-step');
    formSteps.forEach(step => {
        step.classList.remove('active');
    });

    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    const roadmapCircles = document.querySelectorAll('.roadmap .step');
    roadmapCircles.forEach((circle, idx) => {
        if (idx < stepNumber) {
            circle.classList.add('active');
        } else {
            circle.classList.remove('active');
        }
    });

    if (stepNumber === 3) {
        startAutomatedKYC();
    } else {
        stopCamera();
    }

    if (stepNumber === 5) {
        generatePDFReview();
    }
}

/**
 * 2. STEP 1: SEND OTP
 */
async function handleSendOTP() {
    const phone = document.getElementById('phone').value;

    if(phone.length !== 10){
        alert("Please enter a valid 10-digit number.");
        return;
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/send-otp', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone })
        });
        const data = await res.json();

        if(data.success){
            // Show OTP wrapper
            document.getElementById('otpWrapper').classList.remove('hidden');
            // Fill OTP boxes + show on page + copy to clipboard
            fillOTPBoxes(data.otp_dev);
            // Disable send button after OTP sent
            const sendBtn = document.querySelector('.send-btn');
            if(sendBtn){
                sendBtn.disabled = true;
                sendBtn.style.opacity = '0.5';
                sendBtn.innerText = 'OTP Sent';
            }
        } else {
            alert(data.message);
        }
    } catch(err) {
        alert('Backend not running! Start server first.');
    }
}

/**
 * 2b. VERIFY OTP
 */
async function verifyOTP() {
    const boxes = document.querySelectorAll('.otp-box');
    let enteredOtp = '';
    boxes.forEach(box => {
        enteredOtp += box.value;
    });

    if(enteredOtp.length !== 6){
        alert('Please enter complete 6-digit OTP.');
        return;
    }

    const phone = document.getElementById('phone').value;

    try {
        const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone, otp: enteredOtp })
        });
        const data = await res.json();

        if(data.success){
            alert('✅ OTP verified successfully!');
            nextStep(2);
        } else {
            alert('❌ ' + data.message);
            // Clear OTP boxes on wrong OTP
            boxes.forEach(box => box.value = '');
            boxes[0].focus();
        }
    } catch(err) {
        alert('Backend not running! Start server first.');
    }
}

/**
 * 2c. RESEND OTP
 */
async function resendOTP() {
    const phone = document.getElementById('phone').value;

    if(!phone || phone.length !== 10){
        alert('Phone number not found. Please enter phone number first.');
        return;
    }

    const resendBtn = document.getElementById('resendBtn');
    if(resendBtn){
        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/send-otp', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ phone })
        });
        const data = await res.json();

        if(data.success){
            // Use same shared function — fills boxes + shows on page + copies to clipboard
            fillOTPBoxes(data.otp_dev);

            // Start 30 second countdown
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
                        resendBtn.innerText = 'Resend Code';
                    }
                }
            }, 1000);

        } else {
            alert(data.message);
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

/**
 * 2d. PASTE FROM CLIPBOARD
 */
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const numbers = text.trim().replace(/\D/g, '').slice(0, 6);

        if(numbers.length === 0){
            alert('No OTP found in clipboard. OTP is auto copied — just click paste again.');
            return;
        }

        const boxes = document.querySelectorAll('.otp-box');
        boxes.forEach(box => box.value = '');
        numbers.split('').forEach((char, i) => {
            if(boxes[i]) boxes[i].value = char;
        });

        boxes[Math.min(numbers.length - 1, 5)].focus();
    } catch (err) {
        alert("Please allow clipboard access in browser settings.");
    }
}

/**
 * 2e. AUTO FOCUS OTP BOXES
 */
const otpBoxes = document.querySelectorAll('.otp-box');
function moveToNext(input, index) {
    if (input.value.length === 1 && index < otpBoxes.length - 1) {
        otpBoxes[index + 1].focus();
    }
}

/**
 * 3. STEP 2: PERSONAL VALIDATION
 */
function handleStep2() {
    let isValid = true;
    document.querySelectorAll('.err').forEach(e => e.innerText = "");

    const name   = document.getElementById('accName').value;
    const email  = document.getElementById('accEmail').value;
    const pan    = document.getElementById('panNum').value.toUpperCase();
    const aadhar = document.getElementById('aadharNum').value;

    if(name.length < 3){
        document.getElementById('nameErr').innerText = "Enter valid full name";
        isValid = false;
    }
    if(!email.includes("@") || !email.includes(".")){
        document.getElementById('emailErr').innerText = "Invalid Email Address";
        isValid = false;
    }
    const panPattern = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    if(!pan.match(panPattern)){
        document.getElementById('panErr').innerText = "Invalid PAN Format";
        isValid = false;
    }
    if(aadhar.length !== 12 || isNaN(aadhar)){
        document.getElementById('aadharErr').innerText = "Enter 12-digit Aadhaar";
        isValid = false;
    }

    if(isValid){
        nextStep(3);
    }
}

/**
 * 4. STEP 3: AUTOMATED KYC
 */
async function startAutomatedKYC() {
    const video      = document.getElementById('video');
    const circle     = document.getElementById('scanCircle');
    const status     = document.getElementById('kycStatus');
    const proceedBtn = document.getElementById('proceedBtn');

    try {
        kycStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = kycStream;

        status.innerText   = "Scanning Face...";
        status.style.color = "#555";

        setTimeout(() => {
            if(video.srcObject){
                circle.classList.add('detected');
                status.innerText   = "Face Verified Successfully!";
                status.style.color = "#2ecc71";
                proceedBtn.disabled      = false;
                proceedBtn.style.opacity = "1";
                video.pause();
            }
        }, 3000);
    } catch(err) {
        status.innerText   = "Camera Error: Please allow access.";
        status.style.color = "#ff4b2b";
    }
}

function stopCamera() {
    if(kycStream){
        kycStream.getTracks().forEach(track => track.stop());
        kycStream = null;
    }
}

/**
 * 5. STEP 4: SECURITY VALIDATION
 */
function validateSecurity() {
    const user       = document.getElementById('username').value;
    const pin        = document.getElementById('userPin').value;
    const confirm    = document.getElementById('confirmPin').value;
    const captcha    = document.getElementById('captchaInput').value;
    const realCaptcha = document.getElementById('captchaCode').innerText;

    if(user.length < 4)      { alert("Username too short"); return; }
    if(pin !== confirm)       { alert("PINs do not match!"); return; }
    if(pin.length < 4)        { alert("PIN must be 4 digits"); return; }
    if(captcha !== realCaptcha){ alert("Invalid Captcha!"); return; }

    nextStep(5);
}

/**
 * 6. STEP 5: PDF REVIEW
 */
function generatePDFReview() {
    const name   = document.getElementById('accName').value;
    const email  = document.getElementById('accEmail').value;
    const pan    = document.getElementById('panNum').value;
    const aadhar = document.getElementById('aadharNum').value;
    const city   = document.getElementById('city').value;
    const user   = document.getElementById('username').value;

    const pdfContent = `
        <center><h3>HORIZON BANK DIGITAL RECEIPT</h3></center>
        <hr>
        <p><strong>APPLICATION ID:</strong> HB-${Math.floor(Math.random()*1000000)}</p>
        <p><strong>NAME:</strong> ${name}</p>
        <p><strong>EMAIL:</strong> ${email}</p>
        <p><strong>PAN:</strong> ${pan}</p>
        <p><strong>AADHAAR:</strong> XXXX-XXXX-${aadhar.slice(-4)}</p>
        <p><strong>CITY:</strong> ${city}</p>
        <p><strong>USERNAME:</strong> ${user}</p>
        <hr>
        <p style="color:#2ecc71; font-weight:bold;">✔ KYC VERIFICATION SUCCESSFUL</p>
    `;
    document.getElementById('pdf-viewer').innerHTML = pdfContent;
}

/**
 * 7. FINAL SUBMISSION
 */
async function finalSubmit() {
    const isChecked = document.getElementById('termsCheck').checked;
    if(!isChecked){
        alert("Please accept Terms & Conditions to proceed.");
        return;
    }

    const payload = {
        phone:       document.getElementById('phone').value,
        fullName:    document.getElementById('accName').value,
        email:       document.getElementById('accEmail').value,
        pan:         document.getElementById('panNum').value,
        aadhaar:     document.getElementById('aadharNum').value,
        gender:      document.querySelector('input[name="gender"]:checked').value,
        doorNo:      document.getElementById('doorNo').value,
        village:     document.getElementById('village').value,
        city:        document.getElementById('city').value,
        state:       document.getElementById('state').value,
        branchCode:  document.getElementById('branchCode').value,
        nominee:     document.getElementById('nominee').value,
        kycVerified: true,
        username:    document.getElementById('username').value,
        pin:         document.getElementById('userPin').value,
    };

    try {
        const res  = await fetch('http://localhost:5000/api/auth/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload)
        });
        const data = await res.json();

        if(data.success){
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert(`✅ Welcome to Horizon Bank!\nAccount Number: ${data.user.accountNumber}\nPlease login to continue.`);
            window.location.href = 'index.html';
        } else {
            alert('❌ Registration failed: ' + data.message);
        }
    } catch(err) {
        alert('Backend not running! Start server first.');
    }
}
