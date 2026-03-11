
const customerBtn = document.getElementById("customerBtn")
const adminBtn = document.getElementById("adminBtn")

const customerLogin = document.getElementById("customerLogin")
const adminLogin = document.getElementById("adminLogin")

let generatedOTP = ""

customerBtn.onclick = () => {

customerLogin.style.display="block"
adminLogin.style.display="none"

generateCaptcha()

}

adminBtn.onclick = () => {

adminLogin.style.display="block"
customerLogin.style.display="none"

generateAdminCaptcha()

}



function generateOTP(){

generatedOTP = Math.floor(100000 + Math.random()*900000)

alert("OTP: "+generatedOTP)

}



function loginCustomer(){

let otp = document.getElementById("otpInput").value
let captcha = document.getElementById("captchaInput").value
let realCaptcha = document.getElementById("captchaText").innerText

if(otp != generatedOTP){

alert("Wrong OTP")
return

}

if(captcha != realCaptcha){

alert("Captcha Incorrect")
return

}

alert("Customer Login Successful")

}



function loginAdmin(){

let captcha = document.getElementById("adminCaptchaInput").value
let realCaptcha = document.getElementById("adminCaptcha").innerText

if(captcha != realCaptcha){

alert("Captcha Incorrect")
return

}

alert("Admin Login Successful")

}



function generateCaptcha(){

let captcha = Math.random().toString(36).substring(2,7)

document.getElementById("captchaText").innerText = captcha

}



function generateAdminCaptcha(){

let captcha = Math.random().toString(36).substring(2,7)

document.getElementById("adminCaptcha").innerText = captcha

}