// graph.js — Unified Editable AWS Resource Graph Visualizer
// ---------------------------------------------------------------------------

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

function getConnectedNodes(nodeId, direction = "out") {
  const gData = Graph.graphData();
  const out = new Set();
  if (direction === "out" || direction === "both") {
    gData.links.forEach(l => {
      if (l.source.id === nodeId || l.source === nodeId) out.add(l.target.id || l.target);
    });
  }
  if (direction === "in" || direction === "both") {
    gData.links.forEach(l => {
      if (l.target.id === nodeId || l.target === nodeId) out.add(l.source.id || l.source);
    });
  }
  return Array.from(out);
}

function markDownstreamParameters(nodeId, newState, visited = new Set()) {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const gData = Graph.graphData();
  const node = gData.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const locked =
    node.metadata?.implicit_aws_managed ||
    node.metadata?.immutable_reference ||
    node.service === "bedrock";
  if (locked) return;

  node.is_parameter = newState;
  node.metadata = node.metadata || {};
  node.metadata.Parameter = newState;

  const downstream = getConnectedNodes(nodeId, "out");
  downstream.forEach(childId => markDownstreamParameters(childId, newState, visited));
}

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
  const newColors = { ...colorMap };

  gData.nodes.forEach(n => {
    n.subtype = (n.subtype || "").toLowerCase();
    n.service = (n.service || "unknown").toLowerCase();
    n.color_key = n.subtype ? `${n.service}:${n.subtype}` : n.service;
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
  .linkColor(link => (link.inferred ? "#999999" : "#aaaaaa"))
  .linkWidth(link => (link.inferred ? 1.5 : 2.0))
  .linkDirectionalParticles(link => (link.inferred ? 0 : 2))
  .linkCurvature(link => (link.inferred ? 0.2 : 0))
  .linkLabel(link => (link.label ? `${link.label}` : undefined))
  .backgroundColor("#0e1117")
  .onNodeClick(n => {
    if (editMode) showEditPanel(n);
    else {
      Graph.centerAt(n.x, n.y, 800);
      Graph.zoom(4, 800);
      showNodeInfo(n);
    }
  })
  .onNodeRightClick(n => {
    const locked =
      n.metadata?.implicit_aws_managed || n.metadata?.immutable_reference || n.service === "bedrock";
    if (locked) {
      const canvas = document.getElementById("graph");
      canvas.classList.add("node-shake");
      setTimeout(() => canvas.classList.remove("node-shake"), 400);
      return;
    }
    const newState = !n.is_parameter;
    markDownstreamParameters(n.id, newState);
    Graph.graphData(Graph.graphData());
  })
  .nodeVisibility(n => !searchTerm || n.id.toLowerCase().includes(searchTerm))
  .nodeCanvasObject((n, ctx, scale) => {
    const r = 6;
    const active = activeKeys.has(n.color_key);
    const color = colorMap[n.color_key] || "#777";
    const err = n.is_error || n.metadata?.Unresolved || n.metadata?.Error;
    const seed = n.is_seed || n.metadata?.Seed;
    const param = n.is_parameter || n.metadata?.Parameter;
    const implicit = n.metadata?.implicit_aws_managed;
    const locked = implicit || n.metadata?.immutable_reference || n.service === "bedrock";

    if (locked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = "#00ffff";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.7;
    }

    if (param) {
      ctx.beginPath();
      ctx.moveTo(n.x, n.y - r);
      ctx.lineTo(n.x + r, n.y);
      ctx.lineTo(n.x, n.y + r);
      ctx.lineTo(n.x - r, n.y);
      ctx.closePath();
      ctx.fillStyle = active ? color : "rgba(150,150,150,0.25)";
      ctx.fill();
      ctx.strokeStyle = "#ffffff55";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = active ? color : "rgba(150,150,150,0.25)";
      ctx.fill();
    }

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
    ctx.globalAlpha = 1.0;
  });

// -------------------------------------------
// Info / Edit Panels
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

  nodeDetails.appendChild(document.createElement("hr"));
  const det = document.createElement("details");
  det.innerHTML = `<summary><b>Raw Node Data</b></summary>
  <pre class='json-block'>${JSON.stringify(node, null, 2)}</pre>`;
  nodeDetails.appendChild(det);
}

function showEditPanel(node) {
  currentNode = node;
  infoPanel.classList.add("visible");
  nodeTitle.textContent = `Edit: ${node.id}`;
  nodeDetails.innerHTML = `
    <label>Logical ID:</label>
    <input id="editLogicalId" class="editable-field" value="${node.id}" />
    <label>Service:</label>
    <input id="editService" class="editable-field" value="${node.service}" />
    <label>Subtype:</label>
    <input id="editSubtype" class="editable-field" value="${node.subtype}" />
    <label>Properties (JSON):</label>
    <textarea id="editProperties" class="editable-textarea">${JSON.stringify(node.properties, null, 2)}</textarea>
    <div class="panel-actions">
      <button id="saveBtn">Save</button>
    </div>
  `;
  document.getElementById("saveBtn").onclick = () => saveNodeChanges(node);
}

function saveNodeChanges(node) {
  try {
    const newId = document.getElementById("editLogicalId").value.trim();
    const service = document.getElementById("editService").value.trim();
    const subtype = document.getElementById("editSubtype").value.trim();
    const props = JSON.parse(document.getElementById("editProperties").value);

    node.id = newId;
    node.service = service;
    node.subtype = subtype;
    node.properties = props;

    rebuildLegendFromGraph();
    Graph.nodeLabel(n => `${n.id}\n(${n.service}${n.subtype ? ":" + n.subtype : ""})`);
    Graph.graphData(Graph.graphData());
    alert("Node updated successfully.");
    infoPanel.classList.remove("visible");
  } catch (err) {
    alert("Error saving node: " + err.message);
  }
}

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
editToggleBtn.onclick = () => {
  editMode = !editMode;
  editToggleBtn.textContent = `Edit: ${editMode ? "On" : "Off"}`;
  document.body.classList.toggle("edit-mode", editMode);
};

// -------------------------------------------
// Export menu
// -------------------------------------------
const exportMenu = document.createElement("div");
exportMenu.className = "export-menu";
exportMenu.style.display = "none";

const exportJSON = document.createElement("div");
exportJSON.className = "export-item";
exportJSON.textContent = "Export JSON";
exportJSON.onclick = () => exportGraphAsJSON();

const exportCDK = document.createElement("div");
exportCDK.className = "export-item";
exportCDK.textContent = "Export CDK Template";
exportCDK.onclick = () => exportGraphAsCDK();

exportMenu.appendChild(exportJSON);
exportMenu.appendChild(exportCDK);
document.body.appendChild(exportMenu);

exportBtn.onclick = e => {
  e.stopPropagation();
  const rect = exportBtn.getBoundingClientRect();
  exportMenu.style.left = `${rect.left}px`;
  exportMenu.style.top = `${rect.bottom + 5}px`;
  exportMenu.style.display = exportMenu.style.display === "none" ? "block" : "none";
};
document.addEventListener("click", () => (exportMenu.style.display = "none"));

function exportGraphAsJSON() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "graph-edited.json";
  a.click();
  URL.revokeObjectURL(url);
  exportMenu.style.display = "none";
}

async function exportGraphAsCDK() {
  exportMenu.style.display = "none";
  try {
    const response = await fetch("/api/export-cdk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cdk-template.json";
    a.click();
    URL.revokeObjectURL(url);
    console.log("[INFO] CDK template exported successfully.");
  } catch (err) {
    alert("CDK export failed: " + err.message);
    console.error(err);
  }
}

// -------------------------------------------
// Initialize
// -------------------------------------------
rebuildLegendFromGraph();
updateLegendStyles();
