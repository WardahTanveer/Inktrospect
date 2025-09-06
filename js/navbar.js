function toggleMenu() {
    document.querySelector(".nav-links").classList.toggle("active");
}
function showPopup() {
    document.querySelector(".wrapper").classList.add("active-popup");
}
function closePopup() {
    document.querySelector(".wrapper").classList.remove("active-popup");
}

const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const btnPopup = document.querySelector('.btnLogin-popup');
const iconClose = document.querySelector('.icon-close');

if(registerLink){
    registerLink.addEventListener('click',()=>{
        wrapper.classList.add('active');
    });
}
if(loginLink){
    loginLink.addEventListener('click',()=>{
        wrapper.classList.remove('active');
    });
}
if(btnPopup){
    btnPopup.addEventListener('click',()=>{
        wrapper.classList.add('active-popup');
    });
}
if(iconClose){
    iconClose.addEventListener('click',()=>{
        wrapper.classList.remove('active-popup');
    });
}
document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.remove('active');
    });
});

//Register form submission
const regform=document.getElementById('registerForm');
if(regform){
    regform.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('newUser').value;
        const email = document.getElementById('newEmail').value;
        const password = document.getElementById('newPassword').value;
        if (username === "" || email === "" || password === "") {
            alert("All fields are required.");
            return;
        }
        fetch('/register', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Registration successful");
                location.reload();
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

//Login form submission
logform=document.getElementById('loginForm');
if(logform){
    logform.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('logUser').value;
        const password = document.getElementById('logPassword').value;
        fetch('/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                userLoggedIn = true;
                location.reload();
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

//Logout button
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        fetch("/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                console.error("Logout failed:", data.message);
            }
        })
        .catch(err => console.error("Logout error:", err));
    });
}