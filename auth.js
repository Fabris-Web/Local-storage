const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value.toLowerCase().trim();
    const password = document.getElementById("password").value;

    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        const text = await res.text();
        if (!text) {
            alert('Empty response from server. Check backend logs.');
            return;
        }
        let data;
        try { data = JSON.parse(text); } catch (e) {
            alert('Server returned non-JSON response:\n' + text);
            return;
        }
        if (!data || !data.success) {
            alert(data.message || 'Login failed');
            return;
        }
        // Backend returns user object; store minimal info locally for routing
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        window.location.href = 'redirect.html';
    } catch (err) {
        alert('Login error: ' + (err.message || err));
    }
});