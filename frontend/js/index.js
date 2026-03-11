// // Function to handle the login click
// document.addEventListener('DOMContentLoaded', () => {
//     const loginBtn = document.querySelector('.login-submit');
    
//     if(loginBtn) {
//         loginBtn.addEventListener('click', function(e) {
//             e.preventDefault(); // Stops the form from reloading the page
//             window.location.href = "dashboard.html"; // Redirects to your existing page
//         });
//     }
// });

// function openLogin(){
//     document.getElementById("loginModal").style.display="flex";
// }

// function closeLogin(){
//     document.getElementById("loginModal").style.display="none";
// }

// function toggleDarkMode(){
//     document.body.classList.toggle("dark");
// }

// // Add this to your existing js/index.js
// document.addEventListener('DOMContentLoaded', () => {
//     const cards = document.querySelectorAll('.floating-card');
    
//     // Simple hover effect for cards
//     cards.forEach(card => {
//         card.addEventListener('mouseover', () => {
//             card.style.transform = 'scale(1.1)';
//             card.style.zIndex = '100';
//         });
//         card.addEventListener('mouseout', () => {
//             card.style.transform = 'scale(1)';
//             card.style.zIndex = '1';
//         });
//     });
// });

//NAVBAR

function toggleMenu(){

document.querySelector(".bank-nav-links").classList.toggle("active");

}

// OPEN LOGIN POPUP
function openLogin(){
    document.getElementById("loginModal").style.display="flex";
}

// CLOSE LOGIN POPUP
function closeLogin(){
    document.getElementById("loginModal").style.display="none";
}

// DARK MODE
function toggleDarkMode(){
    document.body.classList.toggle("dark");
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


// // REDIRECT AFTER LOGIN
// document.addEventListener("DOMContentLoaded", function(){

//     const buttons = document.querySelectorAll(".login-submit");

//     buttons.forEach(btn => {
//         btn.addEventListener("click", function(e){
//             e.preventDefault();

//             // redirect
//             window.location.href="dashboard.html";
//         });
//     });

// });
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


// FLOATING CARD EFFECT
document.addEventListener('DOMContentLoaded', () => {

const cards = document.querySelectorAll('.floating-card');

cards.forEach(card => {

card.addEventListener('mouseover', () => {
card.style.transform = 'scale(1.1)';
card.style.zIndex = '100';
});

card.addEventListener('mouseout', () => {
card.style.transform = 'scale(1)';
card.style.zIndex = '1';
});

});

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