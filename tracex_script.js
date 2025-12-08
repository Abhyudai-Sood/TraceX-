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
// Process Management
let procs = [{ pid: 1001, name: "init", runtime: 0, mem: 32 }];
let nextPid = 2000;
let currentProcMode = "create";

function openProcModal(mode) {
  if (!session) { alert("Login first"); return; }
  currentProcMode = mode;
  document.getElementById("procModalTitle").textContent = 
    mode === "create" ? "Create Process" : "Kill Process";
  document.getElementById("procCreateFields").style.display = mode === "create" ? "block" : "none";
  document.getElementById("procKillFields").style.display = mode === "kill" ? "block" : "none";
  
  if (mode === "kill") {
    const sel = document.getElementById("procSelect");
    sel.innerHTML = '<option value="">-- choose PID --</option>';
    procs.forEach(p => {
      if (p.name !== "init") {
        const o = document.createElement("option");
        o.value = p.pid;
        o.textContent = p.pid + ":" + p.name;
        sel.appendChild(o);
      }
    });
  }
  
  document.getElementById("procModal").style.display = "flex";
}

function executeProcAction() {
  if (currentProcMode === "create") {
    const name = document.getElementById("procNameInput").value.trim() || "proc";
    const runtime = parseInt(document.getElementById("procRuntimeInput").value || "8", 10);
    const pid = nextPid++;
    const mem = 16 + Math.floor(Math.random() * 48);
    procs.push({ pid, name, runtime, mem });
    alert("Process created: PID " + pid);
  } else {
    const pidVal = document.getElementById("procSelect").value;
    if (!pidVal) { alert("Select a process"); return; }
    const pid = parseInt(pidVal, 10);
    procs = procs.filter(p => p.pid !== pid);
    alert("Process killed: PID " + pid);
  }
  
  renderProcs();
  closeModal("procModal");
}

function renderProcs() {
  const list = document.getElementById("procList");
  list.textContent = procs.length ? procs.map(p => p.pid + ":" + p.name).join(", ") : "--";
  
  const area = document.getElementById("procTableArea");
  area.innerHTML = "";
  
  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>PID</th><th>Name</th><th>Runtime</th><th>Mem</th><th>Action</th></tr></thead>";
  const tb = document.createElement("tbody");
  procs.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.pid}</td><td>${p.name}</td><td>${p.runtime}s</td><td>${p.mem}MB</td><td><button class="killBtn" onclick="killProcDirect(${p.pid})">Kill</button></td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  area.appendChild(table);
}

function killProcDirect(pid) {
  procs = procs.filter(p => p.pid !== pid);
  renderProcs();
}

// Update login to render processes
function login() {
  const u = document.getElementById("userInput").value.trim();
  const p = document.getElementById("passInput").value;
  
  if (USERS[u] && USERS[u].pwd === p) {
    session = { user: u, role: USERS[u].role };
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("sessionUser").textContent = u + " (" + session.role + ")";
    updateVfsUI();
    renderProcs();
  } else {
    alert("Invalid credentials");
  }
}