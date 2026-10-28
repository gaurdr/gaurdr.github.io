// Riding results map for one ballot question.
// The page sets <body data-question="N">; everything else comes from QUESTIONS.
(function () {
  const LIVE_URL = "https://canopy.cbc.ca/live/elections/special/ABREF2026/all";
  const CACHE_URL = "data/results-latest.json";
  const SNAPSHOT_URL = "data/results-snapshot.json";
  const BOUNDARIES_URL = "data/alberta-eds-2019.topojson";
  const REFRESH_MS = 60 * 60 * 1000; // re-fetch results every hour

  const COLORS = {
    blue: ["#c6d6f0", "#8fb0e3", "#4f80cf", "#1f4fa8"],
    red: ["#f3c6c6", "#e58c8c", "#d44f4f", "#a81c1c"],
    grey: "#c9c9c9",
    tie: "#b9a6c9",
  };
  // Lead margin (percentage points) thresholds for the four shades.
  const MARGIN_STEPS = [5, 15, 30];

  const params = new URLSearchParams(location.search);
  const qNum = Number(document.body.dataset.question);
  const Q = window.QUESTIONS[qNum];
  const demo = params.has("demo");

  const fmt = d3.format(",");
  const pct = (v) => (v * 100).toFixed(1) + "%";
  const tooltip = d3.select("#tooltip");

  let ridingsByNum = new Map();
  let paths = []; // all riding <path> selections, for recolouring
  let refreshTimer = null;

  // ---------- data ----------

  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  }

  // Order: CBC live feed → server cache (kept fresh by server.py) → saved snapshot.
  // ?cache=1 skips the live feed, to test the server cache.
  async function loadResults() {
    if (demo) return fakeResults(await getJSON(SNAPSHOT_URL));
    if (!params.has("cache")) {
      try {
        return { feed: await getJSON(LIVE_URL), source: "live" };
      } catch (e) {
        console.warn("Live feed unavailable, trying server cache:", e);
      }
    }
    try {
      return { feed: await getJSON(CACHE_URL), source: "cache" };
    } catch (e) {
      console.warn("Server cache unavailable, using snapshot:", e);
      return { feed: await getJSON(SNAPSHOT_URL), source: "snapshot" };
    }
  }

  // Random results for testing colours and tooltips before any polls report.
  function fakeResults(feed) {
    const f = structuredClone(feed);
    for (const r of f.data.ridings) {
      const race = r.races.find((x) => x.slug === Q.slug);
      const reported = Math.random() < 0.15 ? 0 : Math.ceil(Math.random() * r.totalPolls);
      r.pollsReported = race.pollsReported = reported;
      const turnout = r.totalVoters * (0.35 + Math.random() * 0.3) * (reported / r.totalPolls);
      const blueShare = Math.min(0.9, Math.max(0.1, 0.45 + (Math.random() - 0.5) * 0.6));
      let total = 0;
      for (const c of race.candidates) {
        const share = Q.answers[c.slug].side === "blue" ? blueShare : 1 - blueShare;
        c.votes = reported ? Math.round(turnout * share) : 0;
        total += c.votes;
      }
      race.totalVotesReported = total;
    }
    // Fill the province-wide totals the way CBC's feed does, so demo and live share one code path.
    const prov = f.data.races.find((x) => x.slug === Q.slug);
    for (const c of prov.candidates) {
      c.votes = d3.sum(f.data.ridings, (r) => r.races.find((x) => x.slug === Q.slug).candidates.find((k) => k.slug === c.slug).votes);
    }
    f.data.election.pollsReported = d3.sum(f.data.ridings, (r) => r.pollsReported);
    return { feed: f, source: "demo" };
  }

  // Per-riding summary for this question.
  function summarize(riding) {
    const race = riding.races.find((x) => x.slug === Q.slug);
    const total = d3.sum(race.candidates, (c) => c.votes);
    const answers = race.candidates
      .map((c) => ({
        slug: c.slug,
        label: Q.answers[c.slug]?.label ?? c.slug,
        side: Q.answers[c.slug]?.side ?? "grey",
        votes: c.votes,
        share: total ? c.votes / total : 0,
      }))
      .sort((a, b) => b.votes - a.votes);
    const reported = race.pollsReported ?? riding.pollsReported;
    let status = "unreported";
    if (reported > 0 && total > 0) status = answers[0].votes === answers[1].votes ? "tie" : "leading";
    return {
      num: riding.ridingNumber,
      name: riding.englishName,
      totalVoters: riding.totalVoters,
      totalPolls: race.totalPolls ?? riding.totalPolls,
      reported,
      total,
      answers,
      status,
      margin: total ? answers[0].share - answers[1].share : 0,
    };
  }

  function fillFor(s) {
    if (!s || s.status === "unreported") return COLORS.grey;
    if (s.status === "tie") return COLORS.tie;
    const step = d3.bisect(MARGIN_STEPS, s.margin * 100);
    return COLORS[s.answers[0].side][step];
  }

  // ---------- drawing ----------

  // What to fit a panel to: the focus ridings, optionally padded by a fraction of their extent (to show surroundings).
  function fitTarget(focus, pad) {
    const collection = { type: "FeatureCollection", features: focus };
    if (!pad) return collection;
    const [[w, s], [e, n]] = d3.geoBounds(collection);
    const dx = (e - w) * pad, dy = (n - s) * pad;
    return { type: "MultiPoint", coordinates: [[w - dx, s - dy], [e + dx, s - dy], [e + dx, n + dy], [w - dx, n + dy]] };
  }

  // Names inside a small inset, so a one-colour area still reads. A focus riding is labelled at the centre of its
  // visible part; a neighbour is labelled in the part of its visible area that is clear of the focus ridings.
  function addLabels(svg, features, path, width, height, focusNames) {
    const g = svg.append("g").attr("pointer-events", "none").attr("class", "inset-labels");
    const visible = (f) => {
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      return [Math.max(x0, 0), Math.max(y0, 0), Math.min(x1, width), Math.min(y1, height)];
    };
    const focus = features.filter((f) => focusNames.has(f.properties.name)).map(visible);
    const [fx0, fy0, fx1, fy1] = [d3.min(focus, (b) => b[0]), d3.min(focus, (b) => b[1]), d3.max(focus, (b) => b[2]), d3.max(focus, (b) => b[3])];
    const placed = []; // label boxes already drawn: [x0, y0, x1, y1]
    const box = (text, x, y) => { const w = text.length * 7; return [x - w / 2, y - 9, x + w / 2, y + 9]; };
    const overlaps = (a) => placed.some((b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]);
    const add = (text, x, y, cls) => {
      placed.push(box(text, x, y));
      g.append("text").attr("class", cls).attr("x", x).attr("y", y)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle").text(text);
    };
    for (const f of features.filter((x) => focusNames.has(x.properties.name))) { // city ridings first, so neighbours avoid them
      const [ax, ay, bx, by] = visible(f);
      add(f.properties.name.replace(/^[^-]+-/, ""), (ax + bx) / 2, (ay + by) / 2, "focus-label"); // "West" / "East"
    }
    for (const f of features.filter((x) => !focusNames.has(x.properties.name))) {
      const [ax, ay, bx, by] = visible(f);
      if (bx - ax < 40 || by - ay < 30) continue; // barely in view
      const clearOfFocus = bx < fx0 || ax > fx1 || by < fy0 || ay > fy1;
      let x0 = ax, x1 = bx;
      if (!clearOfFocus) { // keep to the wider side of the focus ridings
        const left = [ax, Math.min(bx, fx0 - 6)], right = [Math.max(ax, fx1 + 6), bx];
        [x0, x1] = left[1] - left[0] >= right[1] - right[0] ? left : right;
      }
      if (x1 - x0 < 70) continue; // no room for the name
      const x = (x0 + x1) / 2, mid = (ay + by) / 2;
      // try the middle of the visible part, then step up and down until the label clears the others
      const y = [0, -20, 20, -40, 40, -60, 60].map((d) => mid + d)
        .find((yy) => yy - 9 >= ay && yy + 9 <= by && !overlaps(box(f.properties.name, x, yy)));
      if (y !== undefined) add(f.properties.name, x, y, "");
    }
  }

  function drawPanel(svgSel, features, focus, width, height, pad = 0, labelled = false) {
    const projection = d3.geoTransverseMercator().rotate([115, 0]);
    projection.fitExtent([[10, 30], [width - 10, height - 10]], fitTarget(focus, pad));
    const path = d3.geoPath(projection);
    const svg = svgSel.attr("viewBox", `0 0 ${width} ${height}`);
    const focusNames = new Set(focus.map((f) => f.properties.name));
    const clipId = "clip-" + svgSel.attr("id");
    svg.append("clipPath").attr("id", clipId).append("rect").attr("width", width).attr("height", height);
    const g = svg.append("g").attr("clip-path", `url(#${clipId})`);
    const sel = g
      .selectAll("path")
      .data(features)
      .join("path")
      .attr("class", "riding")
      .attr("d", path)
      .attr("data-num", (d) => d.properties.num)
      .classed("focus", (d) => labelled && focusNames.has(d.properties.name))
      .on("mouseenter", function () { d3.select(this).raise(); })
      .on("mousemove", (event, d) => showTooltip(event, d.properties.num))
      .on("mouseleave", hideTooltip);
    paths.push(sel);
    if (labelled) sel.filter((d) => focusNames.has(d.properties.name)).raise(); // keep the outline above neighbours
    if (labelled) addLabels(svg, features, path, width, height, focusNames);
    return { svg, path, projection };
  }

  function drawCityBox(panel, features, label) {
    const [[x0, y0], [x1, y1]] = panel.path.bounds({ type: "FeatureCollection", features });
    panel.svg.append("rect").attr("class", "city-box")
      .attr("x", x0 - 3).attr("y", y0 - 3).attr("width", x1 - x0 + 6).attr("height", y1 - y0 + 6);
    panel.svg.append("text").attr("x", x1 + 6).attr("y", y0 + 8)
      .attr("font-size", 11).attr("fill", "#444").text(label);
  }

  function recolor() {
    for (const sel of paths) {
      sel.attr("fill", (d) => fillFor(ridingsByNum.get(d.properties.num)));
    }
  }

  // ---------- tooltip ----------

  function showTooltip(event, num) {
    const s = ridingsByNum.get(num);
    d3.selectAll(".riding").classed("active", (d) => d.properties.num === num);
    if (!s) return;
    const rows = s.answers.map((a, i) => `
      <tr class="${i === 0 && s.status === "leading" ? "lead" : ""}">
        <td>${a.label}</td><td class="num">${fmt(a.votes)}</td><td class="num">${s.total ? pct(a.share) : "–"}</td>
      </tr>
      <tr><td colspan="3"><div class="bar" style="width:${(a.share * 100).toFixed(1)}%;background:${COLORS[a.side][3]}"></div></td></tr>`).join("");
    const headline = {
      unreported: "No results reported yet",
      tie: "Tied",
      leading: `${s.answers[0].label} leads by ${(s.margin * 100).toFixed(1)} pts`,
    }[s.status];
    tooltip.html(`
      <h3>${s.name}</h3>
      <div class="sub">Riding ${s.num} · ${headline}</div>
      <table>${rows}</table>
      <div class="foot">
        Polls reported: ${fmt(s.reported)} of ${fmt(s.totalPolls)}<br>
        Votes counted: ${fmt(s.total)} · Registered voters: ${fmt(s.totalVoters)}
        ${s.total ? `<br>Valid votes ÷ registered voters: ${pct(s.total / s.totalVoters)}` : ""}
      </div>`).style("display", "block");
    const box = tooltip.node().getBoundingClientRect();
    let x = event.clientX + 16, y = event.clientY + 16;
    if (x + box.width > innerWidth - 8) x = event.clientX - box.width - 16;
    if (y + box.height > innerHeight - 8) y = innerHeight - box.height - 8;
    tooltip.style("left", x + "px").style("top", y + "px");
  }

  function hideTooltip() {
    tooltip.style("display", "none");
    d3.selectAll(".riding").classed("active", false);
  }

  // ---------- page text ----------

  function renderSummary(feed, source) {
    const race = feed.data.races.find((x) => x.slug === Q.slug);
    const total = d3.sum(race.candidates, (c) => c.votes);
    const summaries = [...ridingsByNum.values()];
    const cards = [];
    for (const side of ["red", "blue"]) {
      const slug = Object.keys(Q.answers).find((k) => Q.answers[k].side === side);
      const votes = race.candidates.find((x) => x.slug === slug).votes;
      const won = summaries.filter((s) => s.status === "leading" && s.answers[0].slug === slug).length;
      cards.push({ side, label: Q.answers[slug].label, votes, won });
    }
    const unreported = summaries.filter((s) => s.status === "unreported").length;
    const ties = summaries.filter((s) => s.status === "tie").length;

    // CBC's province totals should equal the sum of its riding results; flag it if not.
    const ridingSum = d3.sum(summaries, (s) => s.total);
    if (ridingSum !== total) console.warn(`Q${qNum}: province total ${total} ≠ sum of ridings ${ridingSum}`);
    d3.select("#summary").html(
      cards.map((c) => `
        <div class="card ${c.side}">
          <div class="label">${c.label} – province</div>
          <div class="value">${total ? pct(c.votes / total) : "–"}</div>
          <div>${fmt(c.votes)} votes · leading in ${c.won} ridings</div>
        </div>`).join("") +
      `<div class="card"><div class="label">Ridings not reported</div><div class="value">${unreported}</div><div>of ${summaries.length}${ties ? ` · ${ties} tied` : ""}</div></div>`
    );

    const polls = feed.data.election;
    const state = feed.data.config?.electionState ?? feed.state;
    const when = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const sourceText = {
      live: `<span class="live">● CBC live feed</span> (${state})`,
      manual: `<span class="live">● CBC feed, fetched on request</span> (${state})`,
      cache: `Cached copy of CBC feed (${state}), saved ${feed.cachedAt
        ? new Date(feed.cachedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "time unknown"}`,
      snapshot: "Old snapshot from Oct 19, 1:13 PM, before any results (live feed and cached copy unavailable)",
      demo: "<b>DEMO DATA – random numbers for testing</b>",
    }[source];
    d3.select("#status").html(
      `${sourceText} · ${fmt(polls.pollsReported)} of ${fmt(polls.totalPolls)} polls reported province-wide · checked ${when}`
    );
    return state;
  }

  function renderLegend() {
    const ramp = (side) => {
      const slug = Object.keys(Q.answers).find((k) => Q.answers[k].side === side);
      return `<div class="ramp"><b>${Q.answers[slug].label} leads</b>${COLORS[side].map((c) => `<span style="background:${c}"></span>`).join("")}</div>`;
    };
    d3.select("#legend").html(`
      ${ramp("red")} ${ramp("blue")}
      <div><span class="sw" style="background:${COLORS.grey}"></span>No results yet</div>
      <div><span class="sw" style="background:${COLORS.tie}"></span>Tied</div>
      <div style="color:var(--muted)">Darker = bigger lead (&lt;5, 5–15, 15–30, 30+ pts)</div>`);
  }

  // ---------- main ----------

  function applyFeed(feed, source) {
    ridingsByNum = new Map(feed.data.ridings.map((r) => [r.ridingNumber, summarize(r)]));
    recolor();
    return renderSummary(feed, source);
  }

  // "Get latest from CBC" button: asks server.py to fetch now (which also updates its cache).
  // If the server has no /api/refresh (e.g. a plain static server), fetch CBC directly.
  async function manualRefresh() {
    const btn = d3.select("#refresh-btn").property("disabled", true).text("Fetching…");
    const msg = d3.select("#refresh-msg").text("");
    try {
      let feed, source = "manual";
      try {
        const res = await fetch("api/refresh", { method: "POST", cache: "no-store" });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
        feed = await res.json();
      } catch (e) {
        console.warn("Server refresh failed, fetching CBC directly:", e);
        feed = await getJSON(LIVE_URL);
        source = "live";
      }
      applyFeed(feed, source);
    } catch (e) {
      console.warn("Manual refresh failed:", e);
      msg.text("Couldn't reach CBC. Still showing the previous results.");
    } finally {
      btn.property("disabled", false).text("Get latest from CBC");
    }
  }

  async function refresh() {
    const { feed, source } = await loadResults();
    const state = applyFeed(feed, source);
    // Also runs after a snapshot fallback, so a feed that was down at page load gets retried.
    if (source !== "demo" && state !== "final" && !refreshTimer) {
      refreshTimer = setInterval(refresh, REFRESH_MS);
    }
    if (state === "final" && refreshTimer) clearInterval(refreshTimer);
  }

  async function init() {
    document.title = `Alberta referendum 2026 – Question ${qNum} results by riding`;
    d3.select("#title").text(`Question ${qNum}: ${Q.short}`);
    d3.select("#prompt").text(Q.prompt ?? "");
    const ready = Object.keys(window.QUESTIONS).map(Number).filter((n) => window.QUESTIONS[n].ready);
    const prev = ready.filter((n) => n < qNum).pop();
    const next = ready.find((n) => n > qNum);
    const suffix = demo ? "?demo=1" : "";
    if (prev) d3.select("#nav").append("span").html(` · <a href="q${prev}.html${suffix}">‹ Question ${prev}</a>`);
    if (next) d3.select("#nav").append("span").html(` · <a href="q${next}.html${suffix}">Question ${next} ›</a>`);
    renderLegend();
    if (!demo) {
      d3.select("#status").node().insertAdjacentHTML("afterend",
        `<div class="refresh"><button id="refresh-btn" type="button">Get latest from CBC</button> <span id="refresh-msg"></span></div>`);
      d3.select("#refresh-btn").on("click", manualRefresh);
    }

    const topo = await d3.json(BOUNDARIES_URL);
    const features = topojson.feature(topo, Object.values(topo.objects)[0]).features;
    const calgary = features.filter((f) => f.properties.name.startsWith("Calgary-"));
    const edmonton = features.filter((f) => f.properties.name.startsWith("Edmonton-"));
    const lethbridge = features.filter((f) => f.properties.name.startsWith("Lethbridge-"));

    const main = drawPanel(d3.select("#map-ab"), features, features, 520, 820);
    drawCityBox(main, calgary, "Calgary");
    drawCityBox(main, edmonton, "Edmonton");
    drawCityBox(main, lethbridge, "Lethbridge");
    drawPanel(d3.select("#map-edm"), features, edmonton, 520, 300);
    drawPanel(d3.select("#map-cgy"), features, calgary, 520, 300);
    drawPanel(d3.select("#map-leth"), features, lethbridge, 520, 240, 0.2, true);

    d3.select("#search").on("input", function () {
      const q = this.value.trim().toLowerCase();
      d3.selectAll(".riding").attr("opacity", (d) =>
        !q || d.properties.name.toLowerCase().includes(q) ? 1 : 0.25);
    });

    await refresh();
  }

  init();
})();
