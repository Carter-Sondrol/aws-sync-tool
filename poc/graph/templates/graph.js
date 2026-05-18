/* graph.js - Unified Editable AWS Resource Graph Visualizer */
// ---------------------------------------------------------------------------

// -------------------------------------------
// State and utilities
// -------------------------------------------
let editMode = false;
let searchTerm = "";
let dagModeEnabled = false;

// Category filters
const categoryFilters = {
  full: true,
  managed: true,
  reference: true,
  raw: true,
};

function categorize(node) {
  const cls = (node.classification || "").toUpperCase();
  const isParam = cls === "PARAMETER" || node.reference_only || node.metadata?.Parameter;
  const isExternal = cls === "EXTERNAL" || cls === "ARTIFACT";
  const isManaged = cls === "AWS_MANAGED" || !!node.metadata?.AWSManaged;

  if (isManaged) return "managed";
  if (isParam) return "raw";
  if (isExternal || node.reference_only) return "reference";
  return "full";
}

// Link coloring by label/type
const linkColorMap = {
  referenced_arn: "#8ca6ff",
  inferred: "#999999",
  binding: "#ff66cc",
};

// Central store for edits to avoid mutating the live graph objects
const EditStore = {
  changes: {}, // {nodeId: {...patched fields...}}
  record(id, field, value) {
    if (!this.changes[id]) this.changes[id] = {};
    this.changes[id][field] = value;
  },
  getMerged(node) {
    // We mutate a live node reference to keep layout positions stable.
    const patch = this.changes[node.id];
    if (patch) Object.assign(node, patch);
    return node;
  },
  exportMergedGraph(graphData) {
    const cloned = JSON.parse(JSON.stringify(graphData));
    const index = Object.fromEntries(cloned.nodes.map(n => [n.id, n]));
    for (const [id, patch] of Object.entries(this.changes)) {
      const n = index[id];
      if (n) Object.assign(n, patch);
    }
    return cloned;
  },
};

// Reference to the full graph data (preserve node objects/positions)
const fullData = { nodes: data.nodes, links: data.links };

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

  // Do not flip nodes that are already CDK-ready; they can be synthesized even if parents are parameters.
  const isCDKReady = !!node.metadata?.CDKReady;
  if (newState && isCDKReady) {
    return;
  }

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
const layoutBtn = document.getElementById("layoutBtn");
const miniMap = document.getElementById("miniMap");
const miniCtx = miniMap ? miniMap.getContext("2d") : null;
const catFull = document.getElementById("catFull");
const catManaged = document.getElementById("catManaged");
const catReference = document.getElementById("catReference");
const catParam = document.getElementById("catParam");
const paramList = document.getElementById("paramList");
let selectedEdge = null;

closeBtn.onclick = () => infoPanel.classList.remove("visible");

// Shape/outline toggles
const shapeFilters = {
  cdkReady: true,
  cdkUnsupported: true,
  parameter: true,
};

// -------------------------------------------
// Legend
// -------------------------------------------
function createLegend() {
  legendDiv.innerHTML = "";

  // Link legend
  const linkGroup = document.createElement("div");
  linkGroup.className = "legend-group";
  const linkTitle = document.createElement("div");
  linkTitle.className = "legend-service";
  linkTitle.textContent = "Links";
  linkGroup.appendChild(linkTitle);
  const linkTypes = [
    ["referenced_arn", "ARN reference"],
    ["binding", "Binding / param wiring"],
    ["inferred", "Inferred"],
  ];
  linkTypes.forEach(([k, label]) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const color = linkColorMap[k] || "#aaa";
    item.innerHTML = `<div class='color-box' style='background:${color}'></div>${label}`;
    linkGroup.appendChild(item);
  });
  legendDiv.appendChild(linkGroup);

  // Shape/outline legend
  const shapeGroup = document.createElement("div");
  shapeGroup.className = "legend-group";
  const shapeTitle = document.createElement("div");
  shapeTitle.className = "legend-service";
  shapeTitle.textContent = "Shapes / CDK";
  shapeGroup.appendChild(shapeTitle);

  const shapes = [
    { key: "cdkReady", label: "CDK Ready (green outline)" },
    { key: "cdkUnsupported", label: "CDK Unsupported (square)" },
    { key: "parameter", label: "Parameter (diamond)" },
  ];
  shapes.forEach(({ key, label }) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.dataset.shape = key;
    item.innerHTML = `<div class='shape-dot'></div>${label}`;
    item.onclick = () => toggleShape(key);
    shapeGroup.appendChild(item);
  });
  legendDiv.appendChild(shapeGroup);

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
  const gData = { nodes: fullData.nodes.map(n => EditStore.getMerged(n)) };
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

function applyFilters() {
  const mergedNodes = fullData.nodes.map(n => EditStore.getMerged(n));
  const filteredNodes = mergedNodes.filter(n => {
    const keyOk = activeKeys.has(n.color_key);
    const shapeOk =
      (shapeFilters.parameter || !(n.is_parameter || n.metadata?.Parameter)) &&
      (shapeFilters.cdkUnsupported || !n.metadata?.CDKUnsupported) &&
      (shapeFilters.cdkReady || !n.metadata?.CDKReady);
    const searchOk = !searchTerm || n.id.toLowerCase().includes(searchTerm);
    const catOk = categoryFilters[n.category] !== false;
    return keyOk && shapeOk && searchOk && catOk;
  });

  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = fullData.links.filter(
    l => filteredIds.has(l.source.id || l.source) && filteredIds.has(l.target.id || l.target)
  );

  Graph.graphData({
    nodes: filteredNodes,
    links: filteredLinks,
  });
  rebuildParamList();
}

function toggleGroup(key) {
  const affected = Object.keys(colorMap).filter(k => k === key || k.startsWith(`${key}:`));
  const active = affected.some(k => activeKeys.has(k));
  if (active) affected.forEach(k => activeKeys.delete(k));
  else affected.forEach(k => activeKeys.add(k));
  updateLegendStyles();
  applyFilters();
}

function toggleShape(key) {
  shapeFilters[key] = !shapeFilters[key];
  updateLegendStyles();
  applyFilters();
}

function toggleCategory(key) {
  categoryFilters[key] = !categoryFilters[key];
  applyFilters();
}

function updateLegendStyles() {
  document.querySelectorAll(".legend-item").forEach(el => {
    const key = el.dataset.key;
    const shape = el.dataset.shape;
    let on = true;
    if (key) on = activeKeys.has(key);
    if (shape) on = shapeFilters[shape] !== false;
    el.classList.toggle("inactive", !on);
    const box = el.querySelector(".color-box");
    if (box) box.style.filter = on ? "brightness(1)" : "brightness(0.55)";
  });
}
createLegend();

function rebuildParamList() {
  if (!paramList) return;
  paramList.innerHTML = "";
  const g = Graph.graphData();
  const indegree = {};
  g.nodes.forEach(n => (indegree[n.id] = 0));
  g.links.forEach(l => {
    const tgt = l.target.id || l.target;
    indegree[tgt] = (indegree[tgt] || 0) + 1;
  });

  const params = g.nodes.filter(n => n.category === "raw");
  const sorted = params.sort((a, b) => (indegree[a.id] || 0) - (indegree[b.id] || 0));
  sorted.forEach(n => {
    const div = document.createElement("div");
    div.className = "param-item";
    const badge = indegree[n.id] ? "" : "<span style='color:#ffda6a'>•</span> ";
    div.innerHTML = `${badge}${n.id}`;
    div.onclick = () => {
      Graph.centerAt(n.x, n.y, 800);
      Graph.zoom(4, 800);
      showNodeInfo(n);
    };
    paramList.appendChild(div);
  });
  if (!params.length) {
    paramList.textContent = "None";
  }
}

// -------------------------------------------
// Graph Setup
// -------------------------------------------
// Pre-compute simple layering by seed distance to improve readability
function computeDepths(graph) {
  const depths = {};
  const indegree = {};
  const children = {};

  graph.nodes.forEach(n => {
    indegree[n.id] = 0;
    children[n.id] = [];
  });

  graph.links.forEach(l => {
    const src = l.source?.id || l.source;
    const tgt = l.target?.id || l.target;
    if (src == null || tgt == null) return;
    indegree[tgt] = (indegree[tgt] || 0) + 1;
    if (!children[src]) children[src] = [];
    children[src].push(tgt);
  });

  // Start with nodes that look like seeds (metadata) or indegree 0
  const queue = [];
  graph.nodes.forEach(n => {
    if (n.is_seed || n.metadata?.Seed) {
      depths[n.id] = 0;
      queue.push(n.id);
    }
  });

  if (queue.length === 0) {
    const roots = Object.keys(indegree).filter(k => !indegree[k]);
    roots.forEach(r => {
      depths[r] = 0;
      queue.push(r);
    });
  }

  if (queue.length === 0) {
    // No obvious roots; just seed the first node to avoid all-zero depths
    const first = graph.nodes[0];
    if (first) {
      depths[first.id] = 0;
      queue.push(first.id);
    }
  }

  while (queue.length) {
    const cur = queue.shift();
    const d = depths[cur] ?? 0;
    (children[cur] || []).forEach(child => {
      const proposed = d + 1;
      if (depths[child] == null || proposed > depths[child]) {
        depths[child] = proposed;
      }
      indegree[child] = Math.max(0, (indegree[child] || 1) - 1);
      if (indegree[child] === 0) queue.push(child);
    });
  }

  return depths;
}

const depths = computeDepths(data);

// Seed per-service cluster anchors for initial layout
const serviceClusters = {};
data.nodes.forEach(n => {
  const svc = n.service || "unknown";
  if (!serviceClusters[svc]) {
    serviceClusters[svc] = { x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000 };
  }
  n.x = serviceClusters[svc].x + (Math.random() * 80 - 40);
  n.y = serviceClusters[svc].y + (depths[n.id] || 0) * 20 + (Math.random() * 40 - 20);
});

const fg = document.getElementById("graph");
const Graph = ForceGraph()(fg)
  .graphData(data)
  .nodeId("id")
  .nodeLabel(n => `${n.id}\n(${n.service}${n.subtype ? ":" + n.subtype : ""})`)
  .nodeColor(n => colorMap[n.color_key] || "#777")
  .linkColor(link => {
    const key = link.label || (link.inferred ? "inferred" : "referenced_arn");
    return linkColorMap[key] || (link.inferred ? "#999999" : "#aaaaaa");
  })
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
  .onLinkClick(link => {
    if (!editMode) {
      selectedEdge = link;
      showEdgeInfo(link);
      return;
    }
    selectedEdge = link;
    showEdgeEdit(link);
  })
  .onNodeDragEnd(node => {
    node.fx = null;
    node.fy = null;
  })
  .nodeVisibility(n => !searchTerm || n.id.toLowerCase().includes(searchTerm))
  .nodeCanvasObject((n, ctx, scale) => {
    const r = 6;
    const active = activeKeys.has(n.color_key);
    const color = colorMap[n.color_key] || "#777";
    const err = n.is_error || n.metadata?.Unresolved || n.metadata?.Error;
    const seed = n.is_seed || n.metadata?.Seed;
    const param = (n.is_parameter || n.metadata?.Parameter) && shapeFilters.parameter;
    const implicit = n.metadata?.implicit_aws_managed;
    const locked = implicit || n.metadata?.immutable_reference || n.service === "bedrock";
    const isReferenceOnly = n.category === "reference";

    if (locked) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = "#00ffff";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.7;
    }

    const cdkUnsupported = !!n.metadata?.CDKUnsupported && shapeFilters.cdkUnsupported;
    const cdkReady = !!n.metadata?.CDKReady && shapeFilters.cdkReady;
    const awsManaged = !!n.metadata?.AWSManaged || n.category === "managed";

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
      // CDK-ready vs unsupported: different shapes/sizes
      if (cdkUnsupported) {
        ctx.beginPath();
        ctx.rect(n.x - r, n.y - r, r * 2, r * 2);
        ctx.fillStyle = active ? color : "rgba(150,150,150,0.25)";
        ctx.fill();
        ctx.strokeStyle = "#ff9b00";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = active ? color : "rgba(150,150,150,0.25)";
        ctx.fill();
        if (cdkReady) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#2be384";
          ctx.stroke();
        }
        if (awsManaged) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#00c0ff";
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isReferenceOnly) {
          ctx.lineWidth = 1.25;
          ctx.strokeStyle = "#f7c948";
          ctx.setLineDash([4, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
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

// Mini-map overlay
function drawMiniMap() {
  if (!miniCtx) return;
  miniCtx.clearRect(0, 0, miniMap.width, miniMap.height);
  const scale = 0.04;
  const current = Graph.graphData();
  current.nodes.forEach(n => {
    const color = colorMap[n.color_key] || "#666";
    miniCtx.fillStyle = color;
    miniCtx.fillRect(
      miniMap.width / 2 + (n.x || 0) * scale,
      miniMap.height / 2 + (n.y || 0) * scale,
      3,
      3
    );
  });
  requestAnimationFrame(drawMiniMap);
}
drawMiniMap();

// -------------------------------------------
// Info / Edit Panels
// -------------------------------------------
let currentNode = null;
function showNodeInfo(node) {
  node = EditStore.getMerged(node);
  currentNode = node;
  infoPanel.classList.add("visible");
  nodeTitle.textContent = node.id;
  nodeDetails.innerHTML = "";

  const meta = [
    ["Service", node.service],
    ["Subtype", node.subtype],
    ["CFN Type", node.cfn_type],
    ["Category", node.category],
    ["Classification", node.classification],
    ["Reference only", node.reference_only],
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

function showEdgeInfo(link) {
  infoPanel.classList.add("visible");
  nodeTitle.textContent = `Edge: ${link.source.id || link.source} → ${link.target.id || link.target}`;
  nodeDetails.innerHTML = "";
  const fields = [
    ["From", link.source.id || link.source],
    ["To", link.target.id || link.target],
    ["Label", link.label || "(none)"],
    ["Inferred", link.inferred ? "yes" : "no"],
  ];
  fields.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `<b>${k}:</b> <div>${v ?? ""}</div>`;
    nodeDetails.appendChild(row);
  });
}

function showEdgeEdit(link) {
  infoPanel.classList.add("visible");
  nodeTitle.textContent = `Edit Edge: ${link.source.id || link.source} → ${link.target.id || link.target}`;
  nodeDetails.innerHTML = `
    <div class="info-row"><b>Label:</b> <div>${link.label || "(none)"}</div></div>
    <div class="panel-actions">
      <button id="btnBreakLink">Break link</button>
      <button id="btnInsertBinding">Insert binding node</button>
    </div>
  `;
  document.getElementById("btnBreakLink").onclick = () => breakLink(link);
  document.getElementById("btnInsertBinding").onclick = () => insertBinding(link);
}

function breakLink(link) {
  const src = link.source.id || link.source;
  const tgt = link.target.id || link.target;
  fullData.links = fullData.links.filter(
    l => (l.source.id || l.source) !== src || (l.target.id || l.target) !== tgt
  );
  applyFilters();
  infoPanel.classList.remove("visible");
}

function insertBinding(link) {
  const src = link.source.id || link.source;
  const tgt = link.target.id || link.target;
  // Remove old edge
  fullData.links = fullData.links.filter(
    l => (l.source.id || l.source) !== src || (l.target.id || l.target) !== tgt
  );
  // Create binding node
  const id = `Binding_${Date.now()}`;
  const node = {
    id,
    service: "binding",
    subtype: "param",
    cfn_type: "",
    properties: { link_label: link.label || "", from: src, to: tgt },
    metadata: { Parameter: true, Binding: true },
    classification: "PARAMETER",
    reference_only: true,
    category: "raw",
    color_key: "binding:param",
  };
  fullData.nodes.push(node);
  // Add two edges with binding label
  fullData.links.push({ source: src, target: id, label: "binding-set" });
  fullData.links.push({ source: id, target: tgt, label: "binding-get" });
  colorMap["binding:param"] = colorMap["binding:param"] || "#ff66cc";
  linkColorMap.binding = linkColorMap.binding || "#ff66cc";
  rebuildLegendFromGraph();
  applyFilters();
  infoPanel.classList.remove("visible");
}

function showEditPanel(node) {
  node = EditStore.getMerged(node);
  currentNode = node;
  infoPanel.classList.add("visible");
  nodeTitle.textContent = `Edit: ${node.id}`;
  nodeDetails.innerHTML = `
    <label>Logical ID:</label>
    <input id="editLogicalId" class="editable-field" value="${node.id}" ${editMode ? "" : "disabled"} />
    <label>Service:</label>
    <input id="editService" class="editable-field" value="${node.service}" ${editMode ? "" : "disabled"} />
    <label>Subtype:</label>
    <input id="editSubtype" class="editable-field" value="${node.subtype}" ${editMode ? "" : "disabled"} />
    <label>Properties (JSON):</label>
    <textarea id="editProperties" class="editable-textarea" ${editMode ? "" : "disabled"}>${JSON.stringify(
      node.properties,
      null,
      2
    )}</textarea>
    <details>
      <summary><b>Advanced: JSON patch</b></summary>
      <textarea id="editPatch" class="editable-textarea" ${editMode ? "" : "disabled"}>${JSON.stringify(
        EditStore.changes[node.id] || {},
        null,
        2
      )}</textarea>
      <div class="panel-actions">
        <button id="applyPatchBtn" ${editMode ? "" : "disabled"}>Apply Patch</button>
      </div>
    </details>
    <div class="panel-actions">
      <button id="saveBtn" ${editMode ? "" : "disabled"}>Save</button>
    </div>
  `;
  document.getElementById("saveBtn").onclick = () => saveNodeChanges(node);
  document.getElementById("applyPatchBtn").onclick = () => applyPatch(node);
}

function saveNodeChanges(node) {
  try {
    const newId = document.getElementById("editLogicalId").value.trim();
    const service = document.getElementById("editService").value.trim();
    const subtype = document.getElementById("editSubtype").value.trim();
    const props = JSON.parse(document.getElementById("editProperties").value || "{}");

    EditStore.record(node.id, "id", newId || node.id);
    EditStore.record(node.id, "service", service);
    EditStore.record(node.id, "subtype", subtype);
    EditStore.record(node.id, "properties", props);

    rebuildLegendFromGraph();
    Graph.nodeLabel(n => `${n.id}\n(${n.service}${n.subtype ? ":" + n.subtype : ""})`);
    Graph.graphData(Graph.graphData());
    alert("Node updates staged. Use Export to persist.");
    infoPanel.classList.remove("visible");
  } catch (err) {
    alert("Error saving node: " + err.message);
  }
}

function applyPatch(node) {
  try {
    const patch = JSON.parse(document.getElementById("editPatch").value || "{}");
    Object.entries(patch).forEach(([k, v]) => EditStore.record(node.id, k, v));
    alert("Patch applied (staged).");
  } catch (e) {
    alert("Invalid JSON patch");
  }
}

// -------------------------------------------
// Controls
// -------------------------------------------
resetBtn.onclick = () => {
  searchTerm = "";
  searchBox.value = "";
  activeKeys = new Set(Object.keys(colorMap));
  categoryFilters.full = categoryFilters.managed = categoryFilters.reference = categoryFilters.raw = true;
  if (catFull && catManaged && catReference && catParam) {
    catFull.checked = catManaged.checked = catReference.checked = catParam.checked = true;
  }
  updateLegendStyles();
  applyFilters();
};
searchBox.oninput = () => {
  searchTerm = searchBox.value.trim().toLowerCase();
  applyFilters();
};
editToggleBtn.onclick = () => {
  editMode = !editMode;
  editToggleBtn.textContent = `Edit: ${editMode ? "On" : "Off"}`;
  document.body.classList.toggle("edit-mode", editMode);
};
if (catFull) catFull.onchange = () => toggleCategory("full");
if (catManaged) catManaged.onchange = () => toggleCategory("managed");
if (catReference) catReference.onchange = () => toggleCategory("reference");
if (catParam) catParam.onchange = () => toggleCategory("raw");
if (layoutBtn) {
  layoutBtn.onclick = () => {
    dagModeEnabled = !dagModeEnabled;
    if (dagModeEnabled) {
      applyHierLayout();
      layoutBtn.textContent = "Layout: Hier";
    } else {
      releaseLayout();
      layoutBtn.textContent = "Layout: Free";
    }
  };
}

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
  const merged = EditStore.exportMergedGraph(data);
  const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
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
    const merged = EditStore.exportMergedGraph(data);
    const response = await fetch("/api/export-cdk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
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

// Seed categories and parameter flags up front
fullData.nodes.forEach(n => {
  n.category = categorize(n);
  n.is_parameter =
    n.is_parameter ||
    n.metadata?.Parameter ||
    n.classification === "PARAMETER" ||
    n.reference_only ||
    n.category === "reference" ||
    n.category === "raw";
  n.is_aws_managed = n.category === "managed";
});

rebuildLegendFromGraph();
updateLegendStyles();
rebuildParamList();

// -------------------------------------------
// Layout helpers
// -------------------------------------------
function applyHierLayout() {
  const g = Graph.graphData();
  const depthMap = computeDepths(g);
  const layers = {};
  g.nodes.forEach(n => {
    const d = depthMap[n.id] != null ? depthMap[n.id] : 0;
    if (!layers[d]) layers[d] = [];
    layers[d].push(n);
  });

  const xSpacing = 260;
  const ySpacing = 90;

  // Sort each layer by service for stability
  Object.values(layers).forEach(nodes => {
    nodes.sort((a, b) => `${a.service}-${a.subtype}`.localeCompare(`${b.service}-${b.subtype}`));
  });

  for (const [dStr, nodes] of Object.entries(layers)) {
    const depth = Number(dStr);
    const offset = ((nodes.length - 1) * ySpacing) / 2;
    nodes.forEach((n, idx) => {
      n.fx = depth * xSpacing;
      n.fy = idx * ySpacing - offset;
    });
  }

  Graph.d3ReheatSimulation();
  setTimeout(() => Graph.zoomToFit(500, 40), 80);
}

function releaseLayout() {
  const g = Graph.graphData();
  g.nodes.forEach(n => {
    n.fx = null;
    n.fy = null;
  });
  Graph.dagMode(null);
  Graph.d3ReheatSimulation();
}
