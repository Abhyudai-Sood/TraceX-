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

// Virtual File System
let vfs = { "/home/readme.txt": "Welcome to TraceX demo system." };
let currentFileMode = "read";

function openFileModal(mode) {
  if (!session) { alert("Login first"); return; }
  currentFileMode = mode;
  document.getElementById("fileModalTitle").textContent = 
    mode === "read" ? "Read File" : mode === "write" ? "Write File" : "Delete File";
  document.getElementById("fileModal").style.display = "flex";
}

function executeFileAction() {
  const filename = document.getElementById("fileNameInput").value.trim();
  if (!filename) { alert("Enter filename"); return; }
  
  if (currentFileMode === "write") {
    vfs[filename] = document.getElementById("fileContent").value || "(empty)";
    alert("File written: " + filename);
  } else if (currentFileMode === "read") {
    if (vfs[filename]) {
      alert("File: " + filename + "\n\n" + vfs[filename]);
    } else {
      alert("File not found");
    }
  } else if (currentFileMode === "delete") {
    if (vfs[filename]) {
      delete vfs[filename];
      alert("File deleted");
    } else {
      alert("File not found");
    }
  }
  
  updateVfsUI();
  closeModal("fileModal");
}

function updateVfsUI() {
  const keys = Object.keys(vfs);
  document.getElementById("vfsList").textContent = keys.length ? keys.join(", ") : "--";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

// Update login function to initialize VFS
function login() {
  const u = document.getElementById("userInput").value.trim();
  const p = document.getElementById("passInput").value;
  
  if (USERS[u] && USERS[u].pwd === p) {
    session = { user: u, role: USERS[u].role };
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("sessionUser").textContent = u + " (" + session.role + ")";
    updateVfsUI();
  } else {
    alert("Invalid credentials");
  }
}
