(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const statusEl = byId("status");
  const layerListEl = byId("layer-list");
  const creditEl = byId("map-credit");
  const newsRail = byId("news-rail");
  const newsMeta = byId("news-meta");

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("error", kind === "error");
    statusEl.classList.toggle("loading", kind === "loading");
  }

  const BASEMAPS = [
    { id: "osm", name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap contributors", maxZoom: 19 },
    { id: "carto-light", name: "Carto Light", url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", attr: "© OpenStreetMap © CARTO", maxZoom: 20 },
    { id: "carto-dark", name: "Carto Dark", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "© OpenStreetMap © CARTO", maxZoom: 20 },
    { id: "topo", name: "OpenTopoMap", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap © OpenTopoMap (CC-BY-SA)", maxZoom: 17 }
  ];

  const LAYERS = [
    { id: "flood-extent", name: "Flood extent (27 Aug 2026)", meta: "Observed inundation · HOT", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_flood_extent.geojson", color: "#1d4ed8", fillOpacity: 0.35, weight: 1.5, defaultOn: true, heavy: false },
    { id: "bridge-damage", name: "Bridge damage assessment", meta: "HOT bridge survey · GeoJSON", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_bridge_damage.geojson", color: "#b45309", fillOpacity: 0.5, weight: 2, defaultOn: true, heavy: false },
    { id: "hydropower", name: "Exposed hydropower", meta: "Sites in flood corridor", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_exposed_hydropowers.geojson", color: "#6d28d9", fillOpacity: 0.55, weight: 2, defaultOn: true, heavy: false },
    { id: "aoi", name: "Area of interest", meta: "Flood AOI + 200 m margin", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_aoi.geojson", color: "#0e7490", fillOpacity: 0.08, weight: 1.5, defaultOn: false, heavy: false },
    { id: "buildings-ai", name: "Building damage (AI)", meta: "~8k footprints · may take a moment", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/buildings/hot_flood_npl_buildings_damage.geojson", color: "#9f1239", fillOpacity: 0.45, weight: 0.8, defaultOn: false, heavy: true, styleBy: "damage" },
    { id: "buildings-manual", name: "Buildings (manual OSM)", meta: "Destroyed / damaged tags", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/buildings/hot_flood_npl_buildings_damage_manual_validated.geojson", color: "#be123c", fillOpacity: 0.5, weight: 0.8, defaultOn: false, heavy: true },
    { id: "destroyed-features", name: "Destroyed & damaged features", meta: "OSM destroyed/damaged · large", url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/destroyed_features/hot_flood_npl_destroyed_features_osm.geojson", color: "#7f1d1d", fillOpacity: 0.4, weight: 1, defaultOn: false, heavy: true }
  ];

  const DAMAGE_COLORS = { destroyed: "#7f1d1d", "major-damage": "#b91c1c", "minor-damage": "#ea580c", "no-visible-damage": "#65a30d" };

  const map = window.L.map("map", { center: [28.12, 85.28], zoom: 10, zoomControl: true, attributionControl: true });
  const baseLayers = {};
  let activeBase = null;
  BASEMAPS.forEach((b, i) => {
    const layer = window.L.tileLayer(b.url, { attribution: b.attr, maxZoom: b.maxZoom, crossOrigin: true });
    baseLayers[b.id] = layer;
    if (i === 0) { layer.addTo(map); activeBase = b; creditEl.textContent = b.attr + " · HOT/HDX damage data"; }
  });

  const basemapList = byId("basemap-list");
  BASEMAPS.forEach((b, i) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio"; input.name = "basemap"; input.value = b.id;
    if (i === 0) input.checked = true;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      Object.keys(baseLayers).forEach((key) => map.removeLayer(baseLayers[key]));
      baseLayers[b.id].addTo(map); activeBase = b;
      creditEl.textContent = b.attr + " · HOT/HDX damage data";
    });
    label.appendChild(input); label.appendChild(document.createTextNode(b.name));
    basemapList.appendChild(label);
  });

  const layerState = {};

  function popupHtml(props) {
    if (!props || typeof props !== "object") return "";
    const keys = Object.keys(props).filter((k) => { const v = props[k]; return v != null && v !== "" && typeof v !== "object"; });
    if (!keys.length) return "<em>No attributes</em>";
    const prefer = ["damage", "status", "name", "Name", "bridge", "building", "highway", "osm_id"];
    const ordered = [...prefer.filter((k) => keys.includes(k)), ...keys.filter((k) => !prefer.includes(k)).slice(0, 12)];
    return "<table>" + ordered.map((k) => "<tr><td>" + escapeHtml(k) + "</td><td>" + escapeHtml(String(props[k])) + "</td></tr>").join("") + "</table>";
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
  }
  function styleFeature(def, feature) {
    const p = feature.properties || {}; let color = def.color;
    if (def.styleBy === "damage" && p.damage) { const key = String(p.damage).toLowerCase(); color = DAMAGE_COLORS[key] || def.color; }
    else if (p.status) { const st = String(p.status).toLowerCase(); if (st.includes("destroy")) color = "#7f1d1d"; else if (st.includes("damage")) color = "#ea580c"; }
    return { color, weight: def.weight, opacity: 0.9, fillColor: color, fillOpacity: def.fillOpacity };
  }
  function pointToLayer(def, feature, latlng) {
    const p = feature.properties || {}; let color = def.color;
    if (def.styleBy === "damage" && p.damage) color = DAMAGE_COLORS[String(p.damage).toLowerCase()] || def.color;
    return window.L.circleMarker(latlng, { radius: 5, color, weight: 1, fillColor: color, fillOpacity: 0.75 });
  }

  async function loadLayer(def) {
    const st = layerState[def.id];
    if (st.loaded || st.loading) return st.leafletLayer;
    st.loading = true;
    setStatus(def.heavy ? "Loading " + def.name + " (large file)…" : "Loading " + def.name + "…", "loading");
    try {
      const res = await fetch(def.url, { mode: "cors" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const geojson = await res.json();
      const leafletLayer = window.L.geoJSON(geojson, {
        style: (f) => styleFeature(def, f),
        pointToLayer: (f, ll) => pointToLayer(def, f, ll),
        onEachFeature: (feature, layer) => { const html = popupHtml(feature.properties); if (html) layer.bindPopup(html, { maxWidth: 280 }); }
      });
      st.leafletLayer = leafletLayer; st.loaded = true; st.loading = false; setStatus("");
      return leafletLayer;
    } catch (err) { st.loading = false; setStatus("Could not load " + def.name + ": " + err.message, "error"); return null; }
  }

  async function setLayerVisible(def, on) {
    const st = layerState[def.id];
    if (on) {
      let layer = st.leafletLayer;
      if (!layer) layer = await loadLayer(def);
      if (layer && !map.hasLayer(layer)) layer.addTo(map);
    } else if (st.leafletLayer && map.hasLayer(st.leafletLayer)) {
      map.removeLayer(st.leafletLayer);
    }
  }

  function fitVisible() {
    const group = [];
    Object.values(layerState).forEach((st) => { if (st.leafletLayer && map.hasLayer(st.leafletLayer)) group.push(st.leafletLayer); });
    if (!group.length) { map.setView([28.12, 85.28], 10); return; }
    try { map.fitBounds(window.L.featureGroup(group).getBounds(), { padding: [28, 28], maxZoom: 13 }); } catch (_) {}
  }

  LAYERS.forEach((def) => {
    layerState[def.id] = { def, leafletLayer: null, loaded: false, loading: false };
    const li = document.createElement("li");
    const input = document.createElement("input");
    input.type = "checkbox"; input.id = "ly-" + def.id; input.checked = !!def.defaultOn;
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.innerHTML = '<span class="lname"><span class="swatch" style="background:' + def.color + '"></span>' + escapeHtml(def.name) + '</span><span class="lmeta">' + escapeHtml(def.meta) + '</span>';
    input.addEventListener("change", () => { setLayerVisible(def, input.checked); });
    li.appendChild(input); li.appendChild(label); layerListEl.appendChild(li);
    if (def.defaultOn) setTimeout(() => setLayerVisible(def, true), 50);
  });

  byId("btn-fit").addEventListener("click", fitVisible);
  byId("btn-clear").addEventListener("click", () => {
    LAYERS.forEach((def) => {
      const input = byId("ly-" + def.id);
      if (input && input.checked) { input.checked = false; setLayerVisible(def, false); }
    });
    setStatus("All layers hidden");
  });
  byId("btn-png").addEventListener("click", async () => {
    setStatus("Capturing map…", "loading");
    try {
      const wrap = document.querySelector(".map-wrap");
      const canvas = await window.html2canvas(wrap, { useCORS: true, allowTaint: true, backgroundColor: "#dbe4ea", scale: 2 });
      const a = document.createElement("a"); a.download = "rasuwa-flood-map.png"; a.href = canvas.toDataURL("image/png"); a.click();
      setStatus("PNG downloaded");
    } catch (e) { setStatus("PNG export failed: " + e.message, "error"); }
  });
  setTimeout(() => {
    const any = Object.values(layerState).some((st) => st.leafletLayer && map.hasLayer(st.leafletLayer));
    if (any) fitVisible();
  }, 2500);

  const FALLBACK_NEWS = [
    { title: "NDRRMA Rasuwa flood situation updates", url: "https://ndrrma.gov.np/", date: "Official", source: "NDRRMA" },
    { title: "Nepal Red Cross – Rasuwa flood relief highlights", url: "https://nrcs.org/highlight/9", date: "NRCS", source: "Nepal Red Cross" },
    { title: "HOT Nepal Flood 2026 damage datasets on HDX", url: "https://data.humdata.org/dataset/hot_flood_npl", date: "HDX", source: "Humanitarian Data Exchange" },
    { title: "fAIr building damage assessment – Upper Trishuli & Bhotekoshi", url: "https://data.humdata.org/dataset/hot_flood_npl_buildings_damage", date: "HOT", source: "Humanitarian OpenStreetMap Team" },
    { title: "ReliefWeb – Rasuwa flood reports and maps", url: "https://reliefweb.int/disaster/ff-2026-000123-npl", date: "ReliefWeb", source: "OCHA" }
  ];

  function renderNews(items, sourceLabel) {
    newsRail.innerHTML = "";
    if (!items.length) { newsRail.innerHTML = '<p class="news-empty">No headlines loaded. See official sources linked in the FAQ.</p>'; newsMeta.textContent = "Unavailable"; return; }
    items.forEach((item) => {
      const a = document.createElement("a"); a.className = "news-card"; a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.innerHTML = '<div class="ndate">' + escapeHtml(item.date || "") + '</div><p class="ntitle">' + escapeHtml(item.title) + '</p><div class="nsrc">' + escapeHtml(item.source || "") + '</div>';
      newsRail.appendChild(a);
    });
    newsMeta.textContent = sourceLabel || "Updated";
  }
  function formatDate(iso) {
    if (!iso) return "";
    try { const d = new Date(iso); if (isNaN(d)) return String(iso).slice(0, 10); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return String(iso).slice(0, 10); }
  }
  async function loadNews() {
    try {
      const q = encodeURIComponent("Rasuwa OR Bhotekoshi flood Nepal");
      const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=" + q + "&mode=ArtList&maxrecords=12&format=json&sort=DateDesc";
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) {
        const data = await res.json();
        const arts = (data.articles || []).filter((a) => a.url && a.title);
        if (arts.length) {
          const items = arts.slice(0, 10).map((a) => ({
            title: a.title.replace(/\s+/g, " ").trim(), url: a.url,
            date: formatDate(a.seendate ? a.seendate.slice(0, 4) + "-" + a.seendate.slice(4, 6) + "-" + a.seendate.slice(6, 8) : ""),
            source: a.domain || a.sourcecountry || "News"
          }));
          renderNews(items, "Live · GDELT"); return;
        }
      }
    } catch (_) {}
    try {
      const rss = "https://www.bing.com/news/search?q=Rasuwa+flood+OR+Bhotekoshi+Nepal&format=rss";
      const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(rss);
      const res = await fetch(proxy, { mode: "cors" });
      if (res.ok) {
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const nodes = [...doc.querySelectorAll("item")].slice(0, 10);
        if (nodes.length) {
          const items = nodes.map((n) => ({
            title: (n.querySelector("title")?.textContent || "").trim(),
            url: (n.querySelector("link")?.textContent || "#").trim(),
            date: formatDate(n.querySelector("pubDate")?.textContent || ""),
            source: "Bing News"
          }));
          renderNews(items, "Live · Bing News"); return;
        }
      }
    } catch (_) {}
    renderNews(FALLBACK_NEWS, "Reference links");
  }
  loadNews();
})();
