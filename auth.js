const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value.toLowerCase().trim();
    const password = document.getElementById("password").value;

    // Try to find existing user
    let user = DB.findUser(email, password);

    // If user doesn't exist but is invited to a session as voter, auto-create them
    if (!user) {
        const voterInvites = JSON.parse(localStorage.getItem('voterInvites') || '{}');
        const isInvited = Object.values(voterInvites).some(voters => 
            Array.isArray(voters) && voters.includes(email)
        );

        if (isInvited && password === '1234') {
            // Auto-create voter account
            try {
                DB.addUser(email, 'voter');
                user = DB.findUser(email, password);
            } catch (err) {
                // User already exists
                user = DB.findUser(email, password);
            }
        }
    }

    if (!user) {
        alert("You are not yet invited to any Session!");
        return;
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = "redirect.html";
}); 