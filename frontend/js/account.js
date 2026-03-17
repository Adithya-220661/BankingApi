/**
 * GLOBAL VARIABLES
 */
let kycStream = null;

/**
 * 1. NAVIGATION & ROADMAP LOGIC
 * Unified function to handle 5 steps and the roadmap tracker.
 */
function nextStep(stepNumber) {
    // Hide all form sections
    const formSteps = document.querySelectorAll('.form-step');
    formSteps.forEach(step => {
        step.classList.remove('active');
    });

    // Show the targeted section
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    // UPDATE ROADMAP (1 to 5)
    const roadmapCircles = document.querySelectorAll('.roadmap .step');
    roadmapCircles.forEach((circle, idx) => {
        // idx is 0-based, stepNumber is 1-based
        if (idx < stepNumber) {
            circle.classList.add('active');
        } else {
            circle.classList.remove('active');
        }
    });

    // STEP-SPECIFIC AUTOMATION
    if (stepNumber === 3) {
        startAutomatedKYC();
    } else {
        stopCamera(); // Ensure camera stops if we leave Step 3
    }

    if (stepNumber === 5) {
        generatePDFReview();
    }
}

/**
 * 2. STEP 1: MOBILE & OTP LOGIC
 */
function handleSendOTP() {
    const phone = document.getElementById('phone').value;
    if (phone.length === 10) {
        document.getElementById('otpWrapper').classList.remove('hidden');
        alert("OTP Sent to " + phone);
    } else {
        alert("Please enter a valid 10-digit number.");
    }
}

// Auto-focus logic for OTP boxes
const otpBoxes = document.querySelectorAll('.otp-box');
function moveToNext(input, index) {
    if (input.value.length === 1 && index < otpBoxes.length - 1) {
        otpBoxes[index + 1].focus();
    }
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const otpArray = text.trim().split('').slice(0, 6);
        otpArray.forEach((char, i) => {
            if (otpBoxes[i]) otpBoxes[i].value = char;
        });
        otpBoxes[otpArray.length - 1].focus();
    } catch (err) {
        alert("Allow clipboard access or type manually.");
    }
}

/**
 * 3. STEP 2: PERSONAL VALIDATION
 */
function handleStep2() {
    let isValid = true;
    document.querySelectorAll('.err').forEach(e => e.innerText = "");

    const name = document.getElementById('accName').value;
    const email = document.getElementById('accEmail').value;
    const pan = document.getElementById('panNum').value.toUpperCase();
    const aadhar = document.getElementById('aadharNum').value;

    if (name.length < 3) {
        document.getElementById('nameErr').innerText = "Enter valid full name";
        isValid = false;
    }
    if (!email.includes("@") || !email.includes(".")) {
        document.getElementById('emailErr').innerText = "Invalid Email Address";
        isValid = false;
    }
    const panPattern = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    if (!pan.match(panPattern)) {
        document.getElementById('panErr').innerText = "Invalid PAN Format";
        isValid = false;
    }
    if (aadhar.length !== 12 || isNaN(aadhar)) {
        document.getElementById('aadharErr').innerText = "Enter 12-digit Aadhaar";
        isValid = false;
    }

    if (isValid) {
        nextStep(3);
    }
}

/**
 * 4. STEP 3: AUTOMATED KYC LOGIC
 */
async function startAutomatedKYC() {
    const video = document.getElementById('video');
    const circle = document.getElementById('scanCircle');
    const status = document.getElementById('kycStatus');
    const proceedBtn = document.getElementById('proceedBtn');

    try {
        kycStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = kycStream;

        status.innerText = "Scanning Face...";
        status.style.color = "#555";

        setTimeout(() => {
            if (video.srcObject) { 
                circle.classList.add('detected');
                status.innerText = "Face Verified Successfully!";
                status.style.color = "#2ecc71";
                proceedBtn.disabled = false;
                proceedBtn.style.opacity = "1";
                video.pause();
            }
        }, 3000);
    } catch (err) {
        status.innerText = "Camera Error: Please allow access.";
        status.style.color = "#ff4b2b";
    }
}

function stopCamera() {
    if (kycStream) {
        kycStream.getTracks().forEach(track => track.stop());
        kycStream = null;
    }
}

/**
 * 5. STEP 4: SECURITY VALIDATION
 */
function validateSecurity() {
    const user = document.getElementById('username').value;
    const pin = document.getElementById('userPin').value;
    const confirm = document.getElementById('confirmPin').value;
    const captcha = document.getElementById('captchaInput').value;
    const realCaptcha = document.getElementById('captchaCode').innerText;

    if (user.length < 4) { alert("Username too short"); return; }
    if (pin !== confirm) { alert("PINs do not match!"); return; }
    if (pin.length < 4) { alert("PIN must be 4 digits"); return; }
    if (captcha !== realCaptcha) { alert("Invalid Captcha!"); return; }

    nextStep(5);
}

/**
 * 6. STEP 5: PDF GENERATOR
 */
function generatePDFReview() {
    const name = document.getElementById('accName').value;
    const email = document.getElementById('accEmail').value;
    const pan = document.getElementById('panNum').value;
    const aadhar = document.getElementById('aadharNum').value;
    const city = document.getElementById('city').value;
    const user = document.getElementById('username').value;

    const pdfContent = `
        <center><h3>NETBANK DIGITAL RECEIPT</h3></center>
        <hr>
        <p><strong>APPLICATION ID:</strong> NB-${Math.floor(Math.random()*1000000)}</p>
        <p><strong>NAME:</strong> ${name}</p>
        <p><strong>EMAIL:</strong> ${email}</p>
        <p><strong>PAN:</strong> ${pan}</p>
        <p><strong>AADHAAR:</strong> XXXX-XXXX-${aadhar.slice(-4)}</p>
        <p><strong>CITY:</strong> ${city}</p>
        <p><strong>USERNAME:</strong> ${user}</p>
        <hr>
        <p style="color: #2ecc71; font-weight: bold;">✔ KYC VERIFICATION SUCCESSFUL</p>
    `;
    document.getElementById('pdf-viewer').innerHTML = pdfContent;
}

/**
 * 7. FINAL SUBMISSION
 */
function finalSubmit() {
    const isChecked = document.getElementById('termsCheck').checked;
    if (!isChecked) {
        alert("Please accept Terms & Conditions to proceed.");
        return;
    }
    alert("Account Successfully Created!");
    window.location.href = "index.html"; 
}