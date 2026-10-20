// Cluster map: ridings coloured by k-means cluster, for two clusterings (A = overall leaning, B = issue profile).
// Hover highlights the riding's cluster; click shows the riding and its cluster in the side panel.
(function () {
  const DATA_URL = "data/clusters.json";
  const BOUNDARIES_URL = "data/alberta-eds-2019.topojson";
  // Categorical slots 1, 2, 3 and a berry 4th: validated for all pairs (CVD and normal vision), light surface.
  const COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#c43c8c"];
  const GREY = "#c9c9c9";

  const fmt1 = d3.format(".1f");
  const tooltip = d3.select("#tooltip");
  let D, key = "A", selected = null, legendFocus = null, paths = [], hatches = [];

  const color = (c) => (c == null ? GREY : COLORS[c - 1]);
  const clusterOf = (num) => D.ridings[num]?.[`cluster${key}`] ?? null;
  const C = () => D.clusterings[key];
  const qName = (q) => `Q${q} ${D.meta.questions[q]}`;
  // Placed in the nearest cluster but not used to build it (few polls counted, or an outlier profile).
  const isProvisional = (num) => ["assigned", "outlier"].includes(D.ridings[num]?.[`status${key}`]);

  function featureName(f) {
    if (f === "level") return "Overall leaning";
    if (f.startsWith("prof ")) return `Issue profile: ${f.slice(5)}`;
    return key === "B" ? `${f} (relative to leaning)` : f;
  }

  const STATUS_NOTE = {
    fitted: "",
    assigned: "Fewer than half its polls had reported, so it was not used to build the clusters. It is shown in the nearest cluster.",
    outlier: "Its issue profile is far from every other riding's, so it was not used to build the clusters. It is shown in the nearest cluster.",
    unplaced: "A question had no votes counted yet, so this riding could not be placed in a cluster.",
  };

  // ---------- drawing ----------

  function drawPanel(svgSel, features, focus, width, height) {
    const projection = d3.geoTransverseMercator().rotate([115, 0])
      .fitExtent([[10, 30], [width - 10, height - 10]], { type: "FeatureCollection", features: focus });
    const path = d3.geoPath(projection);
    const svg = svgSel.attr("viewBox", `0 0 ${width} ${height}`);
    const clipId = "clip-" + svgSel.attr("id");
    svg.append("clipPath").attr("id", clipId).append("rect").attr("width", width).attr("height", height);
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent").on("click", () => select(null));
    const sel = svg.append("g").attr("clip-path", `url(#${clipId})`)
      .selectAll("path").data(features).join("path")
      .attr("class", "riding").attr("d", path).attr("tabindex", 0)
      .attr("aria-label", (d) => D.ridings[d.properties.num]?.name ?? d.properties.name)
      .on("mouseenter", function (event, d) { d3.select(this).raise(); hover(d.properties.num); })
      .on("mousemove", (event, d) => showTooltip(event, d.properties.num))
      .on("mouseleave", () => { tooltip.style("display", "none"); hover(null); })
      .on("click", (event, d) => { event.stopPropagation(); select(d.properties.num); })
      .on("keydown", (event, d) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(d.properties.num); } });
    paths.push(sel);
    // Hatching over provisional ridings (drawn above the fills, ignores the mouse).
    const hatchId = "hatch-" + svgSel.attr("id");
    svg.append("defs").append("pattern").attr("id", hatchId).attr("patternUnits", "userSpaceOnUse")
      .attr("width", 6).attr("height", 6).attr("patternTransform", "rotate(45)")
      .append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6)
      .attr("stroke", "#fff").attr("stroke-width", 2.2);
    const hatch = svg.append("g").attr("clip-path", `url(#${clipId})`).attr("pointer-events", "none")
      .selectAll("path").data(features).join("path").attr("d", path).attr("fill", "none")
      .attr("data-hatch", `url(#${hatchId})`);
    hatches.push(hatch);
    return { svg, path };
  }

  function drawCityBox(panel, features, label) {
    const [[x0, y0], [x1, y1]] = panel.path.bounds({ type: "FeatureCollection", features });
    panel.svg.append("rect").attr("class", "city-box").attr("pointer-events", "none")
      .attr("x", x0 - 3).attr("y", y0 - 3).attr("width", x1 - x0 + 6).attr("height", y1 - y0 + 6);
    panel.svg.append("text").attr("x", x1 + 6).attr("y", y0 + 8).attr("font-size", 11).attr("fill", "#444").text(label);
  }

  function recolor() {
    for (const sel of paths) {
      sel.attr("fill", (d) => color(clusterOf(d.properties.num)));
    }
    for (const h of hatches) {
      h.attr("fill", function (d) { return isProvisional(d.properties.num) ? this.dataset.hatch : "none"; });
    }
    highlight(selected ? clusterOf(selected) : legendFocus);
  }

  // Dim every riding outside cluster `c` (null = no dimming); outline the selected riding.
  function highlight(c, hoverNum = null) {
    for (const sel of paths) {
      sel.classed("dim", (d) => c != null && clusterOf(d.properties.num) !== c)
        .classed("sel", (d) => d.properties.num === selected)
        .classed("active", (d) => d.properties.num === hoverNum);
      sel.filter((d) => d.properties.num === selected).raise();
    }
    d3.selectAll(".legend .item").classed("on", function () { return c != null && +this.dataset.c === c; });
  }

  function hover(num) {
    if (num == null) return highlight(selected ? clusterOf(selected) : legendFocus);
    highlight(clusterOf(num) ?? -1, num);
  }

  function showTooltip(event, num) {
    const r = D.ridings[num];
    if (!r) return;
    const c = r[`cluster${key}`];
    tooltip.html(`<h3>${r.name}</h3><div class="chip"><span class="sw" style="background:${color(c)}"></span>
      ${c == null ? "Not placed" : `Cluster ${c}${isProvisional(num) ? " (provisional)" : ""}`}</div><div class="sub" style="margin-top:4px">Click for details</div>`)
      .style("display", "block");
    const box = tooltip.node().getBoundingClientRect();
    let x = event.clientX + 16, y = event.clientY + 16;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 16;
    if (y + box.height > innerHeight - 8) y = innerHeight - box.height - 8;
    tooltip.style("left", x + "px").style("top", y + "px");
  }

  // ---------- side panel ----------

  function yesTable(r, cl) {
    const rows = d3.range(1, 11).map((q) => {
      const v = r ? r.yes[q - 1] : null, avg = cl.yes[q - 1];
      const shown = v ?? avg;
      return `<tr><td class="q">${qName(q)}</td>
        ${r ? `<td class="num">${v == null ? "–" : fmt1(v) + "%"}</td>` : ""}
        <td class="num">${fmt1(avg)}%</td>
        <td class="bars"><div class="track">
          <div class="fill" style="width:${shown}%;background:${color(r ? r[`cluster${key}`] : cl.c)}"></div>
          ${r ? `<div class="tick" style="left:calc(${avg}% - 1px)" title="cluster average"></div>` : ""}
        </div></td></tr>`;
    }).join("");
    return `<table class="yes"><tr><th>Yes share</th>${r ? "<th>Riding</th>" : ""}<th>Cluster avg</th>
      <th>${r ? "Bar: riding · tick: cluster" : ""}</th></tr>${rows}</table>`;
  }

  function clusterSummary(c) {
    const cl = { ...C().clusters[c], c };
    const shap = cl.topShap.map(([f, s]) => `<li>${featureName(f)}: ${Math.round(s * 100)}% of importance</li>`).join("");
    return `
      <div class="chip"><span class="sw" style="background:${color(c)}"></span>Cluster ${c} of ${C().k} · ${cl.n} ridings</div>
      <p>${cl.description}</p>
      <h4>What sets this cluster apart (SHAP)</h4>
      <ul class="reasons">${shap}</ul>
      <p class="note">Examples: ${cl.examples.join(", ")}.</p>`;
  }

  function overview() {
    const cards = Object.entries(C().clusters).map(([c, cl]) => `
      <div style="border-color:${color(+c)}"><b data-c="${c}">Cluster ${c}</b> · ${cl.n} ridings<br>${cl.description}</div>`).join("");
    return `<h3>${C().title}</h3>
      <div class="sub">${C().k} clusters · bootstrap stability ${C().stability.toFixed(2)}
        ${C().exploratory ? ' <span class="badge">exploratory</span>' : ""}</div>
      <div class="card-list">${cards}</div>
      <p class="note">Click a riding on the map, or a cluster name above, for details.</p>`;
  }

  function ridingPanel(num) {
    const r = D.ridings[num], c = r[`cluster${key}`], st = r[`status${key}`];
    let html = `<button class="clear" type="button">Clear</button>
      <h3>${r.name}</h3>
      <div class="sub">Riding ${num} · ${Math.round(r.pollsReported * 100)}% of polls reported</div>
      <div class="chip"><span class="sw" style="background:${color(c)}"></span>${c == null ? "Not placed in a cluster" : `Cluster ${c} of ${C().k}`}</div>
      ${STATUS_NOTE[st] ? `<p class="note">${STATUS_NOTE[st]}</p>` : ""}`;
    if (c == null) return html;
    const cl = { ...C().clusters[c], c };
    const reasons = r[`shap${key}`];
    if (reasons) {
      html += `<h4>Why this cluster</h4>
        <p>The surrogate model gives this riding a ${Math.round(r[`proba${key}`] * 100)}% probability of being in cluster ${c}. Main reasons:</p>
        <ul class="reasons">${reasons.map(([f, v]) => `<li>${featureName(f)}: ${v >= 0 ? "toward" : "away from"} this cluster (${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)})</li>`).join("")}</ul>`;
    }
    if (key === "B" && r.profileTop) {
      html += `<h4>Where it departs from its own leaning</h4><ul class="reasons">${r.profileTop.map(([q, v]) =>
        `<li>${qName(q)}: ${v >= 0 ? "more" : "less"} Yes than its leaning predicts (${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} log-odds)</li>`).join("")}</ul>`;
    }
    html += `<h4>Results</h4>${yesTable(r, cl)}<h4>Cluster ${c}</h4>${clusterSummary(c)}`;
    return html;
  }

  function renderSide() {
    const side = d3.select("#side");
    if (selected != null) side.html(ridingPanel(selected));
    else if (legendFocus != null) side.html(`<button class="clear" type="button">Clear</button>${clusterSummary(legendFocus)}
      <h4>Average results</h4>${yesTable(null, { ...C().clusters[legendFocus], c: legendFocus })}`);
    else side.html(overview());
    side.select(".clear").on("click", () => { legendFocus = null; select(null); });
    side.selectAll(".card-list b").on("click", function () { focusCluster(+this.dataset.c); });
  }

  function select(num) {
    selected = num;
    if (num != null) legendFocus = null;
    highlight(num != null ? clusterOf(num) : legendFocus);
    renderSide();
    d3.selectAll(".cl-table tr").classed("on", function () { return +this.dataset.num === num; });
  }

  function focusCluster(c) {
    selected = null;
    legendFocus = legendFocus === c ? null : c;
    highlight(legendFocus);
    renderSide();
  }

  // ---------- legend, header, table ----------

  function renderHeader() {
    d3.selectAll(".toggle button").attr("aria-selected", function () { return this.dataset.key === key; });
    const s = C();
    d3.select("#explain").html(key === "A"
      ? `Groups ridings by how strongly they voted Yes overall. All 10 questions move together, so this one measure accounts for 96% of the differences between ridings. Stable clusters: bootstrap stability ${s.stability.toFixed(2)}.`
      : `Groups ridings by which questions they voted unusually Yes or No on, given their overall leaning. These groups cut across urban and rural Alberta. <span class="badge">exploratory</span> Bootstrap stability is ${s.stability.toFixed(2)}, below the 0.8 usually taken as stable, so treat the boundaries as soft.`);
    const items = Object.entries(s.clusters).map(([c, cl]) =>
      `<span class="item" data-c="${c}" role="button" tabindex="0"><span class="sw" style="background:${color(+c)}"></span>Cluster ${c} (${cl.n})</span>`).join("");
    d3.select("#legend").html(`${items}<span><span class="sw" style="background:${GREY}"></span> Not placed</span>
      <span><span class="sw provisional-sw"></span> Hatched: provisional (few polls counted, or an outlier)</span>
      <span style="color:var(--muted)">Click a cluster to highlight it</span>`);
    d3.selectAll(".legend .item")
      .on("click", function () { focusCluster(+this.dataset.c); })
      .on("keydown", function (event) { if (event.key === "Enter") focusCluster(+this.dataset.c); });
  }

  function renderTable() {
    const rows = Object.entries(D.ridings).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([num, r]) => `
      <tr data-num="${num}"><td>${r.name}</td>
        <td>${r.clusterA ?? "–"}</td><td>${r.clusterB ?? "–"}</td>
        <td class="num">${r.yes[9] == null ? "–" : fmt1(r.yes[9]) + "%"}</td>
        <td class="num">${Math.round(r.pollsReported * 100)}%</td></tr>`).join("");
    d3.select("#table").html(`<table><tr><th>Riding</th><th>Overall-leaning cluster</th><th>Issue-profile cluster</th>
      <th>Yes on Q10</th><th>Polls reported</th></tr>${rows}</table>`);
    d3.selectAll(".cl-table tr[data-num]").on("click", function () {
      select(+this.dataset.num);
      document.getElementById("side").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function setKey(k) {
    key = k;
    legendFocus = null;
    renderHeader();
    recolor();
    renderSide();
  }

  async function init() {
    const [data, topo] = await Promise.all([d3.json(DATA_URL), d3.json(BOUNDARIES_URL)]);
    D = data;
    const m = D.meta;
    const when = new Date(m.observedAt).toLocaleString("en-CA", { timeZone: "America/Edmonton", month: "long", day: "numeric",
      year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    d3.select("#status").text(`Based on partial results: ${d3.format(",")(m.pollsReported)} of ${d3.format(",")(m.totalPolls)} polls reported, as observed on ${when}. Clusters will change when the final count is in.`);

    const features = topojson.feature(topo, Object.values(topo.objects)[0]).features;
    const calgary = features.filter((f) => f.properties.name.startsWith("Calgary-"));
    const edmonton = features.filter((f) => f.properties.name.startsWith("Edmonton-"));
    const main = drawPanel(d3.select("#map-ab"), features, features, 520, 820);
    drawCityBox(main, calgary, "Calgary");
    drawCityBox(main, edmonton, "Edmonton");
    drawPanel(d3.select("#map-edm"), features, edmonton, 520, 340);
    drawPanel(d3.select("#map-cgy"), features, calgary, 520, 340);

    d3.selectAll(".toggle button").on("click", function () { setKey(this.dataset.key); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { legendFocus = null; select(null); } });
    renderTable();
    setKey("A");
  }

  init();
})();
