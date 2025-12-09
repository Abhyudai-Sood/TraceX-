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

// Logging and Charts
let logs = [];
let stats = { total: 0, allowed: 0, denied: 0 };
let timelineChart = null;
let pieChart = null;
let barChart = null;

function logEvent(action, status) {
  const timestamp = new Date();
  logs.push({ 
    ts: timestamp.getTime(), 
    action, 
    status, 
    user: session.user,
    time: timestamp.toLocaleTimeString()
  });
  stats.total++;
  if (status === "allowed") stats.allowed++;
  else stats.denied++;
  renderStats();
  renderCharts();
  renderActivityFeed();
}

function renderActivityFeed() {
  const feed = document.getElementById("activityFeed");
  feed.innerHTML = "";
  
  const recentLogs = logs.slice(-10).reverse();
  
  if (recentLogs.length === 0) {
    feed.innerHTML = '<div class="small" style="text-align:center;padding:20px;color:#9fb3d1">No activity yet</div>';
    return;
  }
  
  recentLogs.forEach(log => {
    const item = document.createElement("div");
    item.className = `activity-item ${log.status}`;
    item.innerHTML = `
      <div class="activity-action">${formatAction(log.action)}</div>
      <div class="activity-meta">
        <span>👤 ${log.user} • ${log.time}</span>
        <span class="status-tag ${log.status}">${log.status}</span>
      </div>
    `;
    feed.appendChild(item);
  });
}
// Add to LocalStorage Keys (at top with other keys)
const MEM_EXTRA_KEY = "tracex_mem_extra_v1";

// Add to Global State (with other global variables)
let extraMem = 0;

// Update loadState function (add extraMem loading)
function loadState() {
  try { logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { logs = []; }
  try { vfs = JSON.parse(localStorage.getItem(VFS_KEY) || "{}"); } catch { vfs = {}; }
  try { procs = JSON.parse(localStorage.getItem(PROC_KEY) || "[]"); } catch { procs = []; }
  try { extraMem = parseInt(localStorage.getItem(MEM_EXTRA_KEY) || "0", 10); } catch { extraMem = 0; }

  if (!Object.keys(vfs).length) {
    vfs = { "/home/readme.txt": "Welcome to TraceX demo system." };
  }
  if (!procs.length) {
    procs = [{ pid: 1001, name: "init", runtime: 0, mem: 32 }];
  }
  nextPid = procs.length ? Math.max(...procs.map(p => p.pid)) + 1 : 2000;
}

// Update saveState function (add extraMem saving)
function saveState() {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
  localStorage.setItem(PROC_KEY, JSON.stringify(procs));
  localStorage.setItem(MEM_EXTRA_KEY, String(extraMem));
}

// ===== MEMORY MANAGEMENT ===== (Add this entire section)
function totalMemUsed() {
  const fromProcs = procs.reduce((sum, p) => sum + (p.mem || 0), 0);
  return fromProcs + extraMem;
}

function openMemoryModal() {
  if (!session) { alert("Login first"); return; }
  document.getElementById("memResource").value = "";
  document.getElementById("memAmount").value = "";
  document.getElementById("memoryModal").style.display = "flex";
}

function executeMemoryAlloc() {
  if (!session) { alert("Login first"); return; }
  const role = session.role;
  const res = document.getElementById("memResource").value.trim() || "anonymous";
  const amt = parseInt(document.getElementById("memAmount").value || "0", 10);
  
  if (!amt || amt <= 0) { alert("Enter valid MB amount"); return; }
  
  if (!PERMS[role].includes("memory_alloc")) {
    logEvent({ user: session.user, role, action: "memory_alloc", target: res, detail: `${amt}MB`, decision: "denied" });
    closeModal("memoryModal");
    return;
  }
  
  extraMem += amt;
  logEvent({ user: session.user, role, action: "memory_alloc", target: res, detail: `${amt}MB`, decision: "allowed" });
  document.getElementById("memInput").value = `${amt} MB`;
  closeModal("memoryModal");
  saveState();
  renderMemory();
}

function freeMemory() {
  extraMem = 0;
  procs.forEach(p => { p.mem = 0; });
  logEvent({ 
    user: session ? session.user : "system", 
    role: session ? session.role : "system", 
    action: "memory_free", 
    target: "all", 
    decision: "allowed" 
  });
  saveState();
  renderMemory();
  renderProcs();
  renderFeed();
}

function renderMemory() {
  const used = totalMemUsed();
  const cap = 512;
  const pct = Math.min(100, Math.round((used / cap) * 100));
  document.getElementById("memBarFill").style.width = pct + "%";
  document.getElementById("memUsed").textContent = `Used: ${pct}%`;
  document.getElementById("memInput").value = used ? `${used} MB` : "";
}



function formatAction(action) {
  const actionMap = {
    "read_file": "📖 Read File",
    "write_file": "✍️ Write File",
    "delete_file": "🗑️ Delete File",
    "create_process": "⚙️ Create Process",
    "kill_process": "❌ Kill Process",
    "network_request": "🌐 Network Request",
    "memory_alloc": "💾 Memory Allocation"
  };
  return actionMap[action] || action;
}

function renderStats() {
  document.getElementById("totalBadge").textContent = "Total: " + stats.total;
  document.getElementById("allowedBadge").textContent = "Allowed: " + stats.allowed;
  document.getElementById("deniedBadge").textContent = "Denied: " + stats.denied;
}

function renderCharts() {
  const tCanvas = document.getElementById("timeline").getContext("2d");
  const pCanvas = document.getElementById("pie").getContext("2d");
  const bCanvas = document.getElementById("bar").getContext("2d");

  // Timeline Chart
  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(tCanvas, {
    type: "line",
    data: {
      labels: logs.slice(-20).map(() => ""),
      datasets: [{
        data: logs.slice(-20).map(l => l.status === "allowed" ? 1 : 0),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.15)",
        fill: true,
        tension: 0.25
      }]
    },
    options: { 
      animation: false,
      plugins: { legend: { display: false } },
      scales: { y: { min: 0, max: 1 } }
    }
  });

  // Pie Chart
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(pCanvas, {
    type: "doughnut",
    data: {
      labels: ["Allowed", "Denied"],
      datasets: [{ 
        data: [stats.allowed || 1, stats.denied || 1], 
        backgroundColor: ["#10b981", "#ef4444"] 
      }]
    },
    options: { 
      animation: { animateRotate: false },
      plugins: { legend: { position: "bottom", labels: { color: "#9fb3d1" } } }
    }
  });

  // Bar Chart
  if (barChart) barChart.destroy();
  const actionCounts = {};
  logs.forEach(l => actionCounts[l.action] = (actionCounts[l.action] || 0) + 1);
  const sortedActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  barChart = new Chart(bCanvas, {
    type: "bar",
    data: {
      labels: sortedActions.map(a => a[0]),
      datasets: [{ 
        data: sortedActions.map(a => a[1]), 
        backgroundColor: "#f59e0b" 
      }]
    },
    options: { 
      animation: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Update file operations to log events
function executeFileAction() {
  const filename = document.getElementById("fileNameInput").value.trim();
  if (!filename) { alert("Enter filename"); return; }
  
  const status = session.role === "admin" || session.role === "user" ? "allowed" : "denied";
  
  if (status === "denied") {
    alert("Access denied for " + session.role);
    logEvent(currentFileMode + "_file", "denied");
    closeModal("fileModal");
    return;
  }
  
  if (currentFileMode === "write") {
    vfs[filename] = document.getElementById("fileContent").value || "(empty)";
    alert("File written: " + filename);
    logEvent("write_file", "allowed");
  } else if (currentFileMode === "read") {
    if (vfs[filename]) {
      alert("File: " + filename + "\n\n" + vfs[filename]);
      logEvent("read_file", "allowed");
    } else {
      alert("File not found");
    }
  } else if (currentFileMode === "delete") {
    if (vfs[filename]) {
      delete vfs[filename];
      alert("File deleted");
      logEvent("delete_file", "allowed");
    } else {
      alert("File not found");
    }
  }
  
  updateVfsUI();
  closeModal("fileModal");
}

// Update process operations to log events
function executeProcAction() {
  const status = session.role === "admin" ? "allowed" : "denied";
  
  if (status === "denied") {
    alert("Only admin can manage processes");
    logEvent(currentProcMode + "_process", "denied");
    closeModal("procModal");
    return;
  }
  
  if (currentProcMode === "create") {
    const name = document.getElementById("procNameInput").value.trim() || "proc";
    const runtime = parseInt(document.getElementById("procRuntimeInput").value || "8", 10);
    const pid = nextPid++;
    const mem = 16 + Math.floor(Math.random() * 48);
    procs.push({ pid, name, runtime, mem });
    alert("Process created: PID " + pid);
    logEvent("create_process", "allowed");
  } else {
    const pidVal = document.getElementById("procSelect").value;
    if (!pidVal) { alert("Select a process"); return; }
    const pid = parseInt(pidVal, 10);
    procs = procs.filter(p => p.pid !== pid);
    alert("Process killed: PID " + pid);
    logEvent("kill_process", "allowed");
  }
  
  renderProcs();
  closeModal("procModal");
}

// Login to initialize charts
function login() {
  const u = document.getElementById("userInput").value.trim();
  const p = document.getElementById("passInput").value;
  
  if (USERS[u] && USERS[u].pwd === p) {
    session = { user: u, role: USERS[u].role };
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("sessionUser").textContent = `${u} (${session.role})`;
    document.getElementById("roleDisplay").textContent = session.role;
    updateVfsUI();
    renderProcs();
    renderStats();
    renderFeed();
    renderCharts();
    renderMemory();  // ADD THIS LINE
  } else {
    alert("Invalid username or password");
  }
}