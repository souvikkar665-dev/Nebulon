const state = { hypotheses: [], opportunities: [], timeline: [], health: null };
const $ = (selector) => document.querySelector(selector);

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = sessionStorage.getItem("nebulon_access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}

function renderCase(caseData) {
  $("#launch-name").textContent = caseData.launch_name;
  $("#launch-time").textContent = `Launch context · ${caseData.launch_time}`;
  $("#candidate-summary").textContent = caseData.candidate_summary;
}

function renderHypotheses() {
  const list = $("#hypotheses");
  list.innerHTML = state.hypotheses
    .map(
      (item) => `
    <div class="hypothesis">
      <div class="hypothesis-head">
        <div><div class="hypothesis-name">#${item.rank} · ${escapeHtml(item.tracked_object)}</div><div class="hypothesis-sub">${escapeHtml(item.spacecraft_name)} · ${item.supporting_observations.length} supporting observations</div></div>
        <div class="score">${item.evidence_score}</div>
      </div>
      <div class="bar"><span style="width:${item.evidence_score}%"></span></div>
      <span class="confidence ${item.confidence_label === "conflicted" ? "conflicted" : ""}">${escapeHtml(item.confidence_label)} confidence</span>
      ${item.contradictions.length ? `<p class="muted">Conflict: ${escapeHtml(item.contradictions.join("; "))}</p>` : ""}
    </div>
  `,
    )
    .join("");

  const leader = state.hypotheses[0];
  $("#leading-object").textContent = leader
    ? leader.tracked_object.split(" /")[0]
    : "—";
  $("#leading-score").textContent = leader
    ? `${leader.evidence_score}/100 evidence score · ${leader.confidence_label}`
    : "—";
  $("#candidate-count").textContent = state.hypotheses.length;
}

function renderGraph() {
  const graph = $("#graph");
  const nodes = [
    { label: "Aurora-1", type: "spacecraft", x: 50, y: 19 },
    { label: "Object 3", type: "object", x: 25, y: 58 },
    { label: "Object 7", type: "object", x: 50, y: 76 },
    { label: "Object 11", type: "object", x: 75, y: 58 },
    { label: "OBS-204", type: "evidence", x: 20, y: 25 },
    { label: "OBS-229", type: "evidence", x: 80, y: 25 },
  ];
  const lines = [
    [50, 19, 25, 58, 5],
    [50, 19, 50, 76, 3],
    [50, 19, 75, 58, 2],
    [20, 25, 25, 58, 3],
    [80, 25, 50, 76, 2],
    [80, 25, 75, 58, 2],
  ];
  graph.innerHTML =
    lines
      .map(([x1, y1, x2, y2, width]) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy) * 1.03;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return `<span class="graph-line" style="left:${x1}%;top:${y1}%;width:${length}%;height:${width}px;transform:rotate(${angle}deg)"></span>`;
      })
      .join("") +
    nodes
      .map(
        (node) =>
          `<div class="graph-node ${node.type}" style="left:${node.x}%;top:${node.y}%">${escapeHtml(node.label)}</div>`,
      )
      .join("");
}

function renderRecommendation() {
  const best = state.opportunities[0];
  if (!best) return;
  $("#best-gain").textContent = `${best.expected_information_gain}%`;
  $("#recommendation").innerHTML = `
    <div class="recommendation-hero">
      <p class="eyebrow">${best.feasible ? "FEASIBLE EXPERIMENT" : "INFEASIBLE OPPORTUNITY"}</p>
      <strong>${escapeHtml(best.station_id)} · ${escapeHtml(best.window)}</strong>
      <p>${escapeHtml(best.reason)}</p>
      <div class="detail-grid">
        <div><span>Expected information gain</span><strong>${best.expected_information_gain}%</strong></div>
        <div><span>Frequency</span><strong>${escapeHtml(best.frequency)}</strong></div>
        <div><span>Observation type</span><strong>${escapeHtml(best.observation_type)}</strong></div>
        <div><span>Feasibility</span><strong>${Math.round(best.value_factors.station_feasibility * 100)}%</strong></div>
      </div>
    </div>
  `;
}

function renderTimeline(target = "#timeline") {
  $(target).innerHTML = state.timeline
    .slice()
    .reverse()
    .map(
      (item) => `
    <div class="timeline-item ${item.kind === "conflict" ? "conflict" : ""}">
      <time>${escapeHtml(item.time)}</time>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.detail)}</p>
    </div>
  `,
    )
    .join("");
}

function renderHealth() {
  const list = $("#health-list");
  if (!state.health) return;
  list.innerHTML =
    `<div class="health-row"><span>Engine · ${state.health.score_version}</span><strong class="healthy">${state.health.engine}</strong></div>` +
    state.health.sources
      .map(
        (source) =>
          `<div class="health-row"><span>${escapeHtml(source.name)}<br><small class="muted">Freshness ${escapeHtml(source.freshness)}</small></span><strong class="healthy">${escapeHtml(source.status)}</strong></div>`,
      )
      .join("");
}

async function loadAll() {
  try {
    const [caseData, hypotheses, opportunities, timeline, health] =
      await Promise.all([
        api("/api/case"),
        api("/api/hypotheses"),
        api("/api/opportunities"),
        api("/api/timeline"),
        api("/api/health"),
      ]);
    state.hypotheses = hypotheses;
    state.opportunities = opportunities;
    state.timeline = timeline;
    state.health = health;
    renderCase(caseData);
    renderHypotheses();
    renderGraph();
    renderRecommendation();
    renderTimeline();
    renderTimeline("#evidence-list");
    renderHealth();
  } catch (error) {
    showToast("API unavailable. Start the Python server and refresh.");
    console.error(error);
  }
}

$("#refresh-btn").addEventListener("click", loadAll);
$("#replay-btn").addEventListener("click", async () => {
  const result = await api("/api/replay/advance", {
    method: "POST",
    body: "{}",
  });
  showToast(result.message);
  await loadAll();
});
$("#contradiction-btn").addEventListener("click", async () => {
  const result = await api("/api/contradiction", {
    method: "POST",
    body: "{}",
  });
  showToast(result.message);
  await loadAll();
});
$("#verify-btn").addEventListener("click", async () => {
  const leader = state.hypotheses[0];
  if (!leader) return;
  const result = await api("/api/verify", {
    method: "POST",
    body: JSON.stringify({
      hypothesis_id: leader.id,
      decision: "verified by reviewer",
    }),
  });
  showToast(result.message);
  await loadAll();
});

document.querySelectorAll(".nav-item").forEach((button) =>
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document
      .querySelectorAll(".view-panel")
      .forEach((view) => view.classList.add("hidden"));
    const view = button.dataset.view;
    $(`#${view === "overview" ? "overview" : view}-view`).classList.remove(
      "hidden",
    );
  }),
);

loadAll();
