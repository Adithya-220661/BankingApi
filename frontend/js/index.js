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
customerForm.addEventListener("submit", function(e){

e.preventDefault();

window.location.href = "dashboard.html";

});
}


// ADMIN REDIRECT
if(adminForm){
adminForm.addEventListener("submit", function(e){

e.preventDefault();

window.location.href = "admin.html";

});
}

});


// =======================
// RANDOM CAPTCHA GENERATOR
// =======================

function generateCaptcha(){

let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

let captcha = "";

for(let i=0;i<5;i++){

captcha += chars.charAt(Math.floor(Math.random()*chars.length));

}

document.getElementById("captchaText").innerText = captcha;

}



function generateCaptchaAdmin(){

let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

let captcha = "";

for(let i=0;i<5;i++){

captcha += chars.charAt(Math.floor(Math.random()*chars.length));

}

document.getElementById("captchaText2").innerText = captcha;

}

document.addEventListener("DOMContentLoaded", function(){

generateCaptcha();
generateCaptchaAdmin();

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
