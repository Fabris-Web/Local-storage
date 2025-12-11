const user = JSON.parse(localStorage.getItem("currentUser"));
if (!user) window.location.href = "login.html";

switch (user.role) {
    case "super_admin":
        window.location.href = "super_admin.html";
        break;
    case "manager":
        window.location.href = "manager.html";
        break;
    case "voter":
        window.location.href = "voter.html";
        break;
    default:
        window.location.href = "not-authorized.html";
} 