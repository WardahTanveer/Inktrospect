document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();
    const formData = new FormData(this);

    const data = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        message: formData.get('message')
    };

    fetch('/submitContactForm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            alert("Your message has been sent!");
            document.getElementById("contactForm").reset();
        } else {
            alert("Failed to send message: " + result.message);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred while sending your message.");
    });
});
