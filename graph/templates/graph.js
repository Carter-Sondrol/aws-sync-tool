// -------------------------------------------
// State and utilities
// -------------------------------------------
let editMode = false;
let searchTerm = "";

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue},70%,55%)`;
}

// Group color keys
const grouped = {};
Object.keys(colorMap).forEach(k => {
  const idx = k.indexOf(":");
  const svc = idx === -1 ? k : k.slice(0, idx);
  const subtype = idx === -1 ? "default" : k.slice(idx + 1);
  if (!grouped[svc]) grouped[svc] = {};
  grouped[svc][subtype || "default"] = colorMap[k];
});

let activeKeys = new Set(Object.keys(colorMap));

// -------------------------------------------
// DOM references
// -------------------------------------------
const legendDiv = document.getElementById("legend");
const infoPanel = document.getElementById("infoPanel");
const nodeTitle = document.getElementById("nodeTitle");
const nodeDetails = document.getElementById("nodeDetails");
const closeBtn = document.getElementById("closeBtn");
const searchBox = document.getElementById("searchBox");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");
const editToggleBtn = document.getElementById("editToggleBtn");

closeBtn.onclick = () => infoPanel.classList.remove("visible");

// -------------------------------------------
// Legend
// -------------------------------------------
function createLegend() {
  legendDiv.innerHTML = "";
  Object.entries(grouped).forEach(([svc, subs]) => {
    const keys = Object.keys(subs);
    const groupDiv = document.createElement("div");
    groupDiv.className = "legend-group";

    const title = document.createElement("div");
    title.className = "legend-service";
    title.textContent = svc;
    title.onclick = () => toggleGroup(svc);
    groupDiv.appendChild(title);

    const showAll = keys.length > 1;
    keys.forEach(sub => {
      if (sub === "default" && !showAll) return;
      const key = sub === "default" ? svc : `${svc}:${sub}`;
      const color = subs[sub];
      const colorBox =
        sub === "default"
          ? `<div class='color-box' style='background:none;border:1px solid #999'></div>`
          : `<div class='color-box' style='background:${color}'></div>`;
      const label = sub === "default" ? "(all)" : sub;
      const item = document.createElement("div");
      item.className = "legend-item";
      item.dataset.key = key;
      item.innerHTML = `${colorBox}${label}`;
      item.onclick = () => toggleGroup(key);
      groupDiv.appendChild(item);
    });

    legendDiv.appendChild(groupDiv);
  });
  updateLegendStyles();
}

function rebuildLegendFromGraph() {
  const gData = Graph.graphData();
  const seen = new Set();
  const newColors = { ...colorMap };

  gData.nodes.forEach(n => {
    n.subtype = (n.subtype || "").toLowerCase();
    n.service = (n.service || "unknown").toLowerCase();
    n.color_key = n.subtype ? `${n.service}:${n.subtype}` : n.service;
    seen.add(n.color_key);
    if (!newColors[n.color_key]) newColors[n.color_key] = hashColor(n.color_key);
  });

  Object.assign(colorMap, newColors);
  activeKeys = new Set(Object.keys(colorMap));
  Object.keys(grouped).forEach(k => delete grouped[k]);
  Object.keys(colorMap).forEach(k => {
    const idx = k.indexOf(":");
    const svc = idx === -1 ? k : k.slice(0, idx);
    const sub = idx === -1 ? "default" : k.slice(idx + 1);
    if (!grouped[svc]) grouped[svc] = {};
    grouped[svc][sub] = colorMap[k];
  });

  createLegend();
}

function toggleGroup(key) {
  const affected = Object.keys(colorMap).filter(k => k === key || k.startsWith(`${key}:`));
  const active = affected.some(k => activeKeys.has(k));
  if (active) affected.forEach(k => activeKeys.delete(k));
  else affected.forEach(k => activeKeys.add(k));
  updateLegendStyles();
  Graph.graphData(Graph.graphData());
}

function updateLegendStyles() {
  document.querySelectorAll(".legend-item").forEach(el => {
    const key = el.dataset.key;
    const on = activeKeys.has(key);
    el.classList.toggle("inactive", !on);
    const box = el.querySelector(".color-box");
    if (box) box.style.filter = on ? "brightness(1)" : "brightness(0.55)";
  });
}
createLegend();

// -------------------------------------------
// Graph Setup
// -------------------------------------------
const fg = document.getElementById("graph");
const Graph = ForceGraph()(fg)
  .graphData(data)
  .nodeId("id")
  .nodeLabel(n => `${n.id}\n(${n.service}${n.subtype ? ":" + n.subtype : ""})`)
  .nodeColor(n => colorMap[n.color_key] || "#777")
  .linkColor(() => "rgba(255,255,255,0.25)")
  .backgroundColor("#0e1117")
  .onNodeClick(n => {
    Graph.centerAt(n.x, n.y, 800);
    Graph.zoom(4, 800);
    showNodeInfo(n);
  })
  .nodeVisibility(n => !searchTerm || n.id.toLowerCase().includes(searchTerm))
  .nodeCanvasObject((n, ctx, scale) => {
    const active = activeKeys.has(n.color_key);
    const color = colorMap[n.color_key] || "#777";
    const r = 6;
    const err = n.is_error || n.metadata?.Unresolved || n.metadata?.Error;
    const seed = n.is_seed || n.metadata?.Seed;

    if (err) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 3, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,0,0,0.25)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = active ? color : "rgba(150,150,150,0.25)";
    ctx.fill();

    if (err) {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ff3333";
      ctx.stroke();
    } else if (seed) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#f1ff33ff";
      ctx.stroke();
    }

    const fs = 10 / scale;
    ctx.font = `${fs}px Sans-Serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = active ? "#fff" : "rgba(255,255,255,0.35)";
    ctx.fillText(n.id, n.x, n.y + 6);
  });

// -------------------------------------------
// Info Panel
// -------------------------------------------
let currentNode = null;
function showNodeInfo(node) {
  currentNode = node;
  infoPanel.classList.add("visible");
  nodeTitle.textContent = node.id;
  nodeDetails.innerHTML = "";

  const meta = [
    ["Service", node.service],
    ["Subtype", node.subtype],
    ["CFN Type", node.cfn_type],
    ["Error", node.error_msg || ""],
  ];
  meta.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `<b>${k}:</b> <div>${v ?? ""}</div>`;
    nodeDetails.appendChild(row);
  });

  if (node.properties && Object.keys(node.properties).length) {
    nodeDetails.appendChild(document.createElement("hr"));
    const pTitle = document.createElement("div");
    pTitle.innerHTML = "<b>Properties</b>";
    nodeDetails.appendChild(pTitle);
    for (const [k, v] of Object.entries(node.properties)) {
      const row = document.createElement("div");
      row.className = "info-row";
      const pre = document.createElement("pre");
      pre.className = "json-block";
      pre.textContent = typeof v === "object" ? JSON.stringify(v, null, 2) : v;
      row.innerHTML = `<b>${k}:</b>`;
      row.appendChild(pre);
      nodeDetails.appendChild(row);
    }
  }

  if (node.arns && Object.keys(node.arns).length) {
    nodeDetails.appendChild(document.createElement("hr"));
    const aTitle = document.createElement("div");
    aTitle.innerHTML = "<b>ARNs</b>";
    nodeDetails.appendChild(aTitle);
    const list = document.createElement("ul");
    for (const [k, v] of Object.entries(node.arns)) {
      const li = document.createElement("li");
      li.innerHTML = `${k}: <code>${v}</code>`;
      list.appendChild(li);
    }
    nodeDetails.appendChild(list);
  }

  nodeDetails.appendChild(document.createElement("hr"));
  const det = document.createElement("details");
  det.open = false;
  det.innerHTML = `<summary><b>Raw Node Data</b></summary>
  <pre class='json-block'>${JSON.stringify(node, null, 2)}</pre>`;
  nodeDetails.appendChild(det);
}
closeBtn.onclick = () => infoPanel.classList.remove("visible");

// -------------------------------------------
// Controls
// -------------------------------------------
resetBtn.onclick = () => {
  searchTerm = "";
  searchBox.value = "";
  activeKeys = new Set(Object.keys(colorMap));
  updateLegendStyles();
  Graph.graphData(Graph.graphData());
};
searchBox.oninput = () => {
  searchTerm = searchBox.value.trim().toLowerCase();
  Graph.graphData(Graph.graphData());
};
exportBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "graph-edited.json";
  a.click();
  URL.revokeObjectURL(url);
};
editToggleBtn.onclick = () => {
  editMode = !editMode;
  editToggleBtn.textContent = `Edit: ${editMode ? "On" : "Off"}`;
  document.body.classList.toggle("edit-mode", editMode);
};

// -------------------------------------------
// Initialize
// -------------------------------------------
rebuildLegendFromGraph();
updateLegendStyles();
