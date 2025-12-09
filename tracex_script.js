// ===== TRACE X — SECURE SYSCALL INTERFACE =====

// --- Core Configuration ---
const USERS = {
  admin: { pwd: "admin123", role: "admin" },
  user1: { pwd: "user123", role: "user" },
  guest: { pwd: "guest123", role: "guest" }
};

const PERMS = {
  admin: ["file_read", "file_write", "file_delete", "process_create", "process_kill", "memory_alloc"],
  user: ["file_read", "file_write", "process_create", "memory_alloc"],
  guest: ["file_read"]
};

const ACTIONS = ["file_read", "file_write", "file_delete", "process_create", "process_kill", "memory_alloc"];

// LocalStorage Keys
const LOG_KEY = "tracex_logs_v1";
const VFS_KEY = "tracex_vfs_v1";
const PROC_KEY = "tracex_procs_v1";
const MEM_EXTRA_KEY = "tracex_mem_extra_v1";
const ALERT_KEY = "tracex_alerts_v1";

// Global State
let session = null;
let logs = [];
let vfs = {};
let procs = [];
let extraMem = 0;
let alerts = [];
let nextPid = 2000;
let autoTimer = null;

// Chart Instances
let timelineChart = null;
let pieChart = null;
let barChart = null;

// ===== LOAD / SAVE STATE =====
function loadState() {
  try { logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { logs = []; }
  try { vfs = JSON.parse(localStorage.getItem(VFS_KEY) || "{}"); } catch { vfs = {}; }
  try { procs = JSON.parse(localStorage.getItem(PROC_KEY) || "[]"); } catch { procs = []; }
  try { extraMem = parseInt(localStorage.getItem(MEM_EXTRA_KEY) || "0", 10); } catch { extraMem = 0; }
  try { alerts = JSON.parse(localStorage.getItem(ALERT_KEY) || "[]"); } catch { alerts = []; }

  // Initialize default data
  if (!Object.keys(vfs).length) {
    vfs = { "/home/readme.txt": "Welcome to TraceX demo system." };
  }
  if (!procs.length) {
    procs = [{ pid: 1001, name: "init", runtime: 0, mem: 32 }];
  }
  nextPid = procs.length ? Math.max(...procs.map(p => p.pid)) + 1 : 2000;
}

function saveState() {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
  localStorage.setItem(PROC_KEY, JSON.stringify(procs));
  localStorage.setItem(MEM_EXTRA_KEY, String(extraMem));
  localStorage.setItem(ALERT_KEY, JSON.stringify(alerts));
}

// ===== AUTHENTICATION =====
function login() {
  const u = document.getElementById("userInput").value.trim();
  const p = document.getElementById("passInput").value;
  
  if (USERS[u] && USERS[u].pwd === p) {
    session = { user: u, role: USERS[u].role };
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("sessionUser").textContent = `${u} (${session.role})`;
    document.getElementById("roleDisplay").textContent = session.role;
    renderAll();
  } else {
    alert("Invalid username or password");
  }
}

function fillDemo() {
  document.getElementById("userInput").value = "user1";
  document.getElementById("passInput").value = "user123";
}

function logout() {
  if (!confirm("Logout?")) return;
  session = null;
  stopAuto();
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("sessionUser").textContent = "Not logged in";
}

// ===== LOGGING & ANOMALY RULES =====
function logEvent(e) {
  e.ts = Date.now();
  logs.push(e);
  runRules();
  saveState();
  renderAll();
}

function runRules() {
  const L = logs.length;
  
  // Rule 1: Three consecutive denials
  if (L >= 3) {
    const last3 = logs.slice(-3);
    if (last3.every(x => x.decision === "denied" && x.user === last3[0].user)) {
      pushAlert("high", "three_denied", `${last3[0].user}: 3 denied operations`);
    }
  }
  
  // Rule 2: Burst detection
  if (L >= 6) {
    const slice6 = logs.slice(-6);
    const dt = slice6[5].ts - slice6[0].ts;
    if (dt < 4000) {
      pushAlert("high", "burst", `High syscall burst: ${slice6.length} calls in ${Math.round(dt / 1000)}s`);
    }
    
    // Rule 3: Repetitive actions
    const acts = slice6.map(e => e.action);
    if (acts.every(a => a === acts[0])) {
      pushAlert("medium", "repeat", `Repetitive syscall: ${acts[0]}`);
    }
  }
  
  // Rule 4: High denial ratio
  const recent = logs.slice(-20);
  if (recent.length >= 5) {
    const den = recent.filter(e => e.decision === "denied").length;
    if (den / recent.length >= 0.6) {
      pushAlert("high", "deny_ratio", `High deny ratio: ${den}/${recent.length}`);
    }
  }
}

function pushAlert(sev, rule, msg) {
  const now = Date.now();
  if (alerts.length && alerts[0].rule === rule && (now - alerts[0].ts) < 4000) return;
  alerts.unshift({ sev, rule, msg, ts: now });
  if (alerts.length > 6) alerts.pop();
  saveState();
}

// ===== FILE SYSTEM =====
let currentFileMode = "read";

function openFileModal(mode) {
  if (!session) { alert("Login first"); return; }
  currentFileMode = mode;
  document.getElementById("fileModalTitle").textContent = 
    mode === "read" ? "Read File" : mode === "write" ? "Write / Create File" : "Delete File";
  document.getElementById("fileActionBtn").textContent = 
    mode === "read" ? "Read" : mode === "write" ? "Write" : "Delete";
  
  const contentArea = document.getElementById("fileContent");
  contentArea.style.display = mode === "write" ? "block" : "none";
  document.getElementById("fileNameInput").value = "";
  document.getElementById("fileContent").value = "";
  
  const sel = document.getElementById("fileSelect");
  sel.innerHTML = '<option value="">-- choose file --</option>';
  Object.keys(vfs).forEach(name => {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    sel.appendChild(o);
  });
  
  document.getElementById("fileModal").style.display = "flex";
}

function executeFileAction() {
  if (!session) { alert("Login first"); return; }
  const sel = document.getElementById("fileSelect").value;
  const typed = document.getElementById("fileNameInput").value.trim();
  const target = sel || typed;
  if (!target) { alert("Select or enter a filename"); return; }
  
  const role = session.role;
  const action = currentFileMode === "read" ? "file_read" : 
                 currentFileMode === "write" ? "file_write" : "file_delete";
  let allowed = PERMS[role].includes(action);
  let decision = allowed ? "allowed" : "denied";
  
  if (allowed) {
    if (action === "file_write") {
      vfs[target] = document.getElementById("fileContent").value || "(empty)";
    } else if (action === "file_delete") {
      if (vfs[target]) delete vfs[target];
      else decision = "denied";
    }
  }
  
  logEvent({ user: session.user, role, action, target, decision });
  
  if (action === "file_read" && decision === "allowed") {
    alert(`File: ${target}\n\n${vfs[target] || "(empty)"}`);
  }
  
  closeModal("fileModal");
  saveState();
}

function updateVfsUI() {
  const el = document.getElementById("vfsList");
  const keys = Object.keys(vfs);
  el.textContent = keys.length ? keys.join(", ") : "--";
}

// ===== PROCESS MANAGER =====
let currentProcMode = "create";

function openProcModal(mode) {
  if (!session) { alert("Login first"); return; }
  currentProcMode = mode;
  document.getElementById("procModalTitle").textContent = 
    mode === "create" ? "Create Process" : "Kill Process";
  document.getElementById("procCreateFields").style.display = mode === "create" ? "block" : "none";
  document.getElementById("procKillFields").style.display = mode === "kill" ? "block" : "none";
  
  if (mode === "create") {
    document.getElementById("procNameInput").value = "";
    document.getElementById("procRuntimeInput").value = "8";
  } else {
    const sel = document.getElementById("procSelect");
    sel.innerHTML = '<option value="">-- choose PID --</option>';
    procs.forEach(p => {
      if (p.name === "init") return;
      const o = document.createElement("option");
      o.value = p.pid;
      o.textContent = `${p.pid}:${p.name}`;
      sel.appendChild(o);
    });
  }
  
  document.getElementById("procModal").style.display = "flex";
}

function executeProcAction() {
  if (!session) { alert("Login first"); return; }
  const role = session.role;
  
  if (currentProcMode === "create") {
    const name = document.getElementById("procNameInput").value.trim() || "proc";
    const runtime = parseInt(document.getElementById("procRuntimeInput").value || "8", 10);
    const allowed = PERMS[role].includes("process_create");
    let decision = allowed ? "allowed" : "denied";
    
    if (allowed) {
      const pid = nextPid++;
      const memAlloc = 16 + Math.floor(Math.random() * 48);
      procs.push({ pid, name, runtime, mem: memAlloc });
    }
    
    logEvent({ user: session.user, role, action: "process_create", target: name, decision });
  } else {
    const pidVal = document.getElementById("procSelect").value;
    if (!pidVal) { alert("Select a process"); return; }
    const pid = parseInt(pidVal, 10);
    const allowed = PERMS[role].includes("process_kill");
    let decision = allowed ? "allowed" : "denied";
    
    if (allowed) {
      const idx = procs.findIndex(p => p.pid === pid);
      if (idx >= 0) {
        const procName = procs[idx].name;
        procs.splice(idx, 1);
        logEvent({ user: session.user, role, action: "process_kill", target: `${pid}:${procName}`, decision });
      }
    } else {
      logEvent({ user: session.user, role, action: "process_kill", target: pid, decision });
    }
  }
  
  closeModal("procModal");
  saveState();
  renderAll();
}

function quickSpawn() {
  if (!session) { alert("Login first"); return; }
  const role = session.role;
  if (!PERMS[role].includes("process_create")) { alert("Permission denied"); return; }
  
  const name = document.getElementById("quickProcName").value.trim() || "task";
  const runtime = parseInt(document.getElementById("quickProcTime").value || "6", 10);
  const pid = nextPid++;
  const memAlloc = 16 + Math.floor(Math.random() * 64);
  
  procs.push({ pid, name, runtime, mem: memAlloc });
  logEvent({ user: session.user, role, action: "process_create", target: name, decision: "allowed" });
  
  document.getElementById("quickProcName").value = "";
  document.getElementById("quickProcTime").value = "";
  saveState();
  renderAll();
}

function killProcDirect(pid) {
  if (!session) { alert("Login first"); return; }
  const role = session.role;
  if (!PERMS[role].includes("process_kill")) { alert("Permission denied"); return; }
  
  const idx = procs.findIndex(p => p.pid === pid);
  if (idx >= 0) {
    const p = procs[idx];
    procs.splice(idx, 1);
    logEvent({ user: session.user, role, action: "process_kill", target: `${pid}:${p.name}`, decision: "allowed" });
    saveState();
    renderAll();
  }
}

function tickProcesses() {
  let changed = false;
  const now = Date.now();
  
  for (let p of procs) {
    if (p.name === "init") continue;
    if (p.runtime > 0) {
      p.runtime--;
      changed = true;
    }
  }
  
  const exiting = procs.filter(p => p.runtime === 0 && p.name !== "init");
  if (exiting.length) {
    exiting.forEach(p => {
      logs.push({ 
        user: "kernel", 
        role: "system", 
        action: "process_exit", 
        target: `${p.pid}:${p.name}`, 
        decision: "allowed", 
        ts: now 
      });
    });
    procs = procs.filter(p => !(p.runtime === 0 && p.name !== "init"));
    changed = true;
  }
  
  if (changed) {
    saveState();
    renderAll();
  }
}

// ===== MEMORY MANAGEMENT =====
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
  renderAll();
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
  renderAll();
}

function renderMemory() {
  const used = totalMemUsed();
  const cap = 512;
  const pct = Math.min(100, Math.round((used / cap) * 100));
  document.getElementById("memBarFill").style.width = pct + "%";
  document.getElementById("memUsed").textContent = `Used: ${pct}%`;
  document.getElementById("memInput").value = used ? `${used} MB` : "";
}

// ===== AUTO SIMULATION =====
function toggleAuto() {
  if (autoTimer) { stopAuto(); return; }
  autoTimer = setInterval(simulateStep, 1200);
  document.getElementById("autoBtn").textContent = "⏸ Auto";
}

function stopAuto() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  document.getElementById("autoBtn").textContent = "▶ Auto";
}

function simulateStep() {
  const uNames = Object.keys(USERS);
  const uname = uNames[Math.floor(Math.random() * uNames.length)];
  const role = USERS[uname].role;
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const prev = session;
  session = { user: uname, role };
  
  if (action.startsWith("file")) {
    const keys = Object.keys(vfs);
    let target = keys.length ? keys[Math.floor(Math.random() * keys.length)] : "auto.txt";
    if (action === "file_write") vfs[target] = vfs[target] || "(auto)";
    if (action === "file_delete" && !vfs[target]) { session = prev; return; }
    logEvent({ user: uname, role, action, target, decision: "allowed" });
  } else if (action === "process_create") {
    const pid = nextPid++;
    const memAlloc = 16 + Math.floor(Math.random() * 32);
    procs.push({ pid, name: "auto_proc", runtime: 6, mem: memAlloc });
    logEvent({ user: uname, role, action: "process_create", target: "auto_proc", decision: "allowed" });
  } else if (action === "process_kill") {
    const candidates = procs.filter(p => p.name !== "init");
    if (!candidates.length) { session = prev; return; }
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    procs = procs.filter(x => x.pid !== p.pid);
    logEvent({ user: uname, role, action: "process_kill", target: `${p.pid}:${p.name}`, decision: "allowed" });
  } else if (action === "memory_alloc") {
    extraMem += 8;
    logEvent({ user: uname, role, action: "memory_alloc", target: "auto_buffer", detail: "8MB", decision: "allowed" });
  }
  
  session = prev;
  saveState();
  renderAll();
}

// ===== EXPORT / IMPORT / CLEAR =====
function exportLogs() {
  const data = { logs, vfs, procs, extraMem, alerts };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tracex_export.json";
  a.click();
}

function importLogs() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".json";
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        logs = obj.logs || [];
        vfs = obj.vfs || {};
        procs = obj.procs || [];
        extraMem = parseInt(obj.extraMem || "0", 10);
        alerts = obj.alerts || [];
        saveState();
        renderAll();
        alert("Import successful");
      } catch (e) {
        alert("Invalid JSON file");
      }
    };
    r.readAsText(file);
  };
  inp.click();
}

function clearAll() {
  if (!confirm("Clear logs, files, processes and memory?")) return;
  logs = [];
  vfs = { "/home/readme.txt": "Welcome to TraceX demo system." };
  procs = [{ pid: 1001, name: "init", runtime: 0, mem: 32 }];
  extraMem = 0;
  alerts = [];
  nextPid = 1002;
  saveState();
  renderAll();
}

// ===== RENDERING =====
function renderStats() {
  const total = logs.length;
  const allowed = logs.filter(l => l.decision === "allowed").length;
  const denied = total - allowed;
  document.getElementById("totalBadge").textContent = "Total: " + total;
  document.getElementById("allowedBadge").textContent = "Allowed: " + allowed;
  document.getElementById("deniedBadge").textContent = "Denied: " + denied;
}

function renderFeed() {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  logs.slice(-80).reverse().forEach(e => {
    const d = document.createElement("div");
    d.className = "entry " + (e.decision === "allowed" ? "ok" : "no");
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;">
        <div><b>${e.action}</b> <span class="small">by ${e.user}</span></div>
        <div class="small">${new Date(e.ts).toLocaleTimeString()}</div>
      </div>
      <div class="small" style="margin-top:4px;">
        ${e.target ? `target: ${e.target}` : ""} ${e.detail ? `• ${e.detail}` : ""}
      </div>`;
    feed.appendChild(d);
  });
}

function renderAlerts() {
  const box = document.getElementById("alerts");
  box.innerHTML = "";
  alerts.forEach(a => {
    const div = document.createElement("div");
    div.className = a.sev === "high" ? "alert-red" : "alert-yellow";
    div.innerHTML = `<strong>${a.msg}</strong><span class="small" style="float:right">${new Date(a.ts).toLocaleTimeString()}</span>`;
    box.appendChild(div);
  });
}

function renderProcs() {
  const list = document.getElementById("procList");
  list.textContent = procs.length ? procs.map(p => `${p.pid}:${p.name}`).join(", ") : "--";
  
  const area = document.getElementById("procTableArea");
  area.innerHTML = "";
  if (!procs.length) {
    area.innerHTML = '<div class="small">No running processes</div>';
    return;
  }
  
  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>PID</th><th>Name</th><th>Runtime</th><th>Mem</th><th>Action</th></tr></thead>";
  const tb = document.createElement("tbody");
  procs.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.pid}</td>
      <td>${p.name}</td>
      <td>${p.runtime || 0}s</td>
      <td>${p.mem || 0}MB</td>
      <td><button class="killBtn" onclick="killProcDirect(${p.pid})">Kill</button></td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  area.appendChild(table);
}

function renderCharts() {
  const tCanvas = document.getElementById("timeline").getContext("2d");
  const pCanvas = document.getElementById("pie").getContext("2d");
  const bCanvas = document.getElementById("bar").getContext("2d");

  const slice = logs.slice(-40);
  const labels = slice.map(e => new Date(e.ts).toLocaleTimeString());
  const vals = slice.map(e => e.decision === "allowed" ? 1 : 0);
  
  // Timeline Chart - Update instead of destroy
  if (timelineChart) {
    timelineChart.data.labels = labels;
    timelineChart.data.datasets[0].data = vals;
    timelineChart.update('none'); // 'none' mode = no animation
  } else {
    timelineChart = new Chart(tCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: vals,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 2
        }]
      },
      options: {
        animation: false, // Disable animation
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 1 } }
      }
    });
  }
  
  const ok = logs.filter(l => l.decision === "allowed").length;
  const no = logs.length - ok;
  
  // Pie Chart - Update instead of destroy
  if (pieChart) {
    pieChart.data.datasets[0].data = [ok || 1, no || 1];
    pieChart.update('none'); // No animation for smooth update
  } else {
    pieChart = new Chart(pCanvas, {
      type: "doughnut",
      data: {
        labels: ["Allowed", "Denied"],
        datasets: [{
          data: [ok || 1, no || 1],
          backgroundColor: ["#10b981", "#ef4444"]
        }]
      },
      options: {
        animation: {
          animateRotate: false, // Disable rotation animation
          animateScale: false   // Disable scale animation
        },
        plugins: { 
          legend: { 
            position: "bottom",
            labels: { color: '#e6f0fb' }
          }
        }
      }
    });
  }
  
  const counts = ACTIONS.map(a => logs.filter(l => l.action === a).length);
  
  // Bar Chart - Update instead of destroy
  if (barChart) {
    barChart.data.datasets[0].data = counts;
    barChart.update('none'); // No animation
  } else {
    barChart = new Chart(bCanvas, {
      type: "bar",
      data: {
        labels: ACTIONS,
        datasets: [{
          data: counts,
          backgroundColor: "#3b82f6"
        }]
      },
      options: {
        animation: false, // Disable animation
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { color: '#e6f0fb' }
          },
          x: { 
            ticks: { 
              color: '#e6f0fb',
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });
  }
}

function renderAll() {
  updateVfsUI();
  renderProcs();
  renderFeed();
  renderAlerts();
  renderStats();
  renderMemory();
  renderCharts();
}

// ===== MODAL HELPER =====
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "none";
}

// Close modal when clicking background
document.addEventListener("click", e => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});

// ===== INITIALIZATION =====
loadState();
renderAll();
setInterval(tickProcesses, 1000);
document.getElementById("loginScreen").style.display = "flex";
document.getElementById("dashboard").style.display = "none";