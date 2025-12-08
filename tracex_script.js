// User database with role-based access
const USERS = {
  admin: { pwd: "admin123", role: "admin" },
  user1: { pwd: "user123", role: "user" },
  guest: { pwd: "guest123", role: "guest" }
};

let session = null;

function login() {
  const u = document.getElementById("userInput").value.trim();
  const p = document.getElementById("passInput").value;
  
  if (USERS[u] && USERS[u].pwd === p) {
    session = { user: u, role: USERS[u].role };
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("sessionUser").textContent = u + " (" + session.role + ")";
  } else {
    alert("Invalid credentials");
  }
}

function logout() {
  session = null;
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
}
