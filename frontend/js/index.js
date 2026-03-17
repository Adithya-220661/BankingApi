// Toggle Accessibility Drawer
function toggleAccessibilityMenu() {
    document.getElementById("accMenu").classList.toggle("active");
}

// Text Resizing
let baseFontSize = 100; // percent
function changeFontSize(action) {
    if (action === 'plus') baseFontSize += 10;
    else baseFontSize -= 10;
    document.body.style.fontSize = baseFontSize + "%";
}

// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode-active");
    // Simple dark mode coloring
    if(document.body.classList.contains("dark-mode-active")) {
        document.body.style.background = "#000000";
        document.body.style.color = "#ffffff";
        document.querySelector(".bank-navbar").style.background = "#ffffff";
    } else {
        document.body.style.background = "";
        document.body.style.color = "";
        document.querySelector(".bank-navbar").style.background = "#ffffff";
    }
}

//login js code



// OPEN LOGIN POPUP
function openLogin(){
    document.getElementById("loginModal").style.display="flex";
}

// CLOSE LOGIN POPUP
function closeLogin(){
    document.getElementById("loginModal").style.display="none";
}



// SWITCH TO CUSTOMER LOGIN
function showCustomer(){
    document.getElementById("customerLogin").style.display="block";
    document.getElementById("adminLogin").style.display="none";
}

// SWITCH TO ADMIN LOGIN
function showAdmin(){
    document.getElementById("customerLogin").style.display="none";
    document.getElementById("adminLogin").style.display="block";
}

// REDIRECT AFTER LOGIN
document.addEventListener("DOMContentLoaded", function(){

const customerForm = document.getElementById("customerLogin");
const adminForm = document.getElementById("adminLogin");

// CUSTOMER REDIRECT
if(customerForm){
customerForm.addEventListener("submit", async function(e){
e.preventDefault();

const username = document.querySelector('#customerLogin input[type="text"]').value;
const pin      = document.querySelector('#customerLogin input[type="password"]').value;
const captchaInput = document.getElementById('captchaInput').value.trim();
const captchaText = document.getElementById('captchaText').innerText.trim();

// Basic validation
if(!username || !pin){
  alert('Please enter username and PIN.');
  return;
}

if(captchaInput !== captchaText){
    alert('❌ Invalid Captcha! Please try again.');
    generateCaptcha('captchaText');
    return;
}

try {
  const res  = await fetch('http://localhost:5000/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, pin })
  });
  const data = await res.json();

  if(data.success){
    // ✅ Found in database → go to dashboard
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    alert(`Welcome back, ${data.user.fullName}!`);
    window.location.href = 'dashboard.html';

  } else {
    // ❌ Not found → show message
    const goRegister = window.confirm(
      '❌ ' + data.message + '\n\nDo you want to create a new account?'
    );
    if(goRegister){
      window.location.href = 'registration.html';
    }
  }

} catch(err) {
  alert('❌ Cannot connect to server. Make sure backend is running on port 5000.');
}

});
}

// ADMIN REDIRECT
if(adminForm){
adminForm.addEventListener("submit", async function(e){
e.preventDefault();

const adminId  = document.querySelector('#adminLogin input[placeholder="Enter Admin ID"]').value;
const password = document.querySelector('#adminLogin input[type="password"]').value;
const bankId   = document.querySelector('#adminLogin input[placeholder="Enter OTP"]').value;

try {
  const res  = await fetch('http://localhost:5000/api/auth/admin-login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ adminId, password, bankId })
  });
  const data = await res.json();

  if(data.success){
    localStorage.setItem('token', data.token);
    window.location.href = 'admin.html';
  } else {
  if(data.message === 'Invalid username or PIN.'){
    const confirm = window.confirm(
      'Account not found! Do you want to create a new account?'
    );
    if(confirm){
      window.location.href = 'registration.html';
    }
  } else {
    alert(data.message);
  }
}
} catch(err) {
  alert('Backend not running! Start server first.');
}

});
}


});


// =======================
// RANDOM CAPTCHA GENERATOR
// =======================
function generateCaptcha(targetId){

    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let captcha = "";

    for(let i=0;i<5;i++){
        captcha += chars.charAt(Math.floor(Math.random()*chars.length));
    }

    document.getElementById(targetId).innerText = captcha;
}

document.addEventListener("DOMContentLoaded", function(){
    generateCaptcha("captchaText");
    generateCaptcha("captchaText2");
});

// Card hover glow

document.querySelectorAll(".service-card").forEach(card => {

card.addEventListener("mouseenter", () => {
card.style.transform="translateY(-12px)";
});

card.addEventListener("mouseleave", () => {
card.style.transform="translateY(0)";
});

});



// Clear form on page load (after refresh)
window.onload = function() {
    document.getElementById("customerLogin").reset();
    document.getElementById("adminLogin").reset();
    generateCaptcha("captchaText");
    generateCaptcha("captchaText2");
};

function togglePassword() {

    let pass = event.target.previousElementSibling; // input before icon
    let eye = event.target;

    if (pass.type === "password") {
        pass.type = "text";
        eye.innerText = "🙉";   // open eyes
    } else {
        pass.type = "password";
        eye.innerText = "🙈";   // closed eyes
    }
}


//fAQ section 

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(item => {

const question = item.querySelector(".faq-question");

question.addEventListener("click", () => {

faqItems.forEach(el=>{
if(el !== item){
el.classList.remove("active");
el.querySelector(".faq-answer").style.maxHeight = null;
el.querySelector(".icon").textContent = "+";
}
});

item.classList.toggle("active");

const answer = item.querySelector(".faq-answer");
const icon = item.querySelector(".icon");

if(item.classList.contains("active")){
answer.style.maxHeight = answer.scrollHeight + "px";
icon.textContent = "−";
}else{
answer.style.maxHeight = null;
icon.textContent = "+";
}

});

});

//product box 

window.addEventListener('scroll', () => {
    const cards = document.querySelectorAll('.product-card');
    const triggerBottom = window.innerHeight / 5 * 4;

    cards.forEach(card => {
        const cardTop = card.getBoundingClientRect().top;
        if(cardTop < triggerBottom) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
    });
});
window.addEventListener("load",function(){

setTimeout(function(){
document.getElementById("logoSplash").classList.add("fadeOut");
},2500);

setTimeout(function(){
document.getElementById("logoSplash").style.display="none";
},4000);

});
