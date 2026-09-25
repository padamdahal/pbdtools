(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const statusEl = $("status");
  const layerList = $("layer-list");
  const creditEl = $("map-credit");

  function setStatus(msg, isError) {
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("error", !!isError);
  }

  /* ---------- basemaps (free, no API key) ---------- */
  const BASEMAPS = [
    {
      id: "osm",
      name: "OpenStreetMap",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: "© OpenStreetMap contributors",
      maxZoom: 19,
      cors: true,
    },
    {
      id: "carto-light",
      name: "Carto Light",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attr: "© OpenStreetMap © CARTO",
      maxZoom: 20,
      cors: true,
    },
    {
      id: "carto-dark",
      name: "Carto Dark",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attr: "© OpenStreetMap © CARTO",
      maxZoom: 20,
      cors: true,
    },
    {
      id: "topo",
      name: "OpenTopoMap",
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attr: "© OpenStreetMap © OpenTopoMap (CC-BY-SA)",
      maxZoom: 17,
      cors: true,
    },
    {
      id: "esri-imagery",
      name: "Esri World Imagery",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attr: "Tiles © Esri",
      maxZoom: 19,
      cors: true,
    },
    {
      id: "esri-topo",
      name: "Esri World Topo",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attr: "Tiles © Esri",
      maxZoom: 19,
      cors: true,
    },
  ];

  /* Nepal-ish default view */
  const map = L.map("map", {
    center: [28.2, 84.0],
    zoom: 7,
    zoomControl: true,
    attributionControl: true,
  });

  const baseLayers = {};
  let activeBase = null;

  BASEMAPS.forEach((b, i) => {
    const layer = L.tileLayer(b.url, {
      attribution: b.attr,
      maxZoom: b.maxZoom,
      crossOrigin: true,
    });
    baseLayers[b.id] = layer;
    if (i === 0) {
      layer.addTo(map);
      activeBase = b;
      creditEl.textContent = b.attr;
    }
  });

  const list = $("basemap-list");
  BASEMAPS.forEach((b, i) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "basemap";
    input.value = b.id;
    if (i === 0) input.checked = true;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      Object.values(baseLayers).forEach((l) => map.removeLayer(l));
      baseLayers[b.id].addTo(map);
      activeBase = b;
      creditEl.textContent = b.attr;
    });
    label.append(input, document.createTextNode(b.name));
    list.appendChild(label);
  });

  /* ---------- uploaded layers ---------- */
  const COLORS = ["#0b6e4f", "#1d4ed8", "#b45309", "#9f1239", "#6d28d9", "#0e7490", "#4d7c0f"];
  let colorIdx = 0;
  const uploads = [];

  function nextColor() {
    const c = COLORS[colorIdx % COLORS.length];
    colorIdx++;
    return c;
  }

  function popupHtml(props) {
    if (!props || !Object.keys(props).length) return "<em>No attributes</em>";
    const rows = Object.keys(props)
      .slice(0, 24)
      .map((k) => {
        const v = props[k];
        const text = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return "<tr><td>" + escapeHtml(k) + "</td><td>" + escapeHtml(text) + "</td></tr>";
      })
      .join("");
    return "<table>" + rows + "</table>";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  function styleFor(color) {
    return {
      color: color,
      weight: 2.5,
      opacity: 0.95,
      fillColor: color,
      fillOpacity: 0.25,
    };
  }

  function pointToLayer(color, feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 7,
      color: color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.7,
    });
  }

  function addGeoJSON(geojson, name) {
    const color = nextColor();
    const layer = L.geoJSON(geojson, {
      style: () => styleFor(color),
      pointToLayer: (f, ll) => pointToLayer(color, f, ll),
      onEachFeature: (feature, lyr) => {
        lyr.bindPopup(popupHtml(feature.properties || {}), { maxWidth: 280 });
      },
    });
    layer.addTo(map);

    let count = 0;
    layer.eachLayer(() => {
      count++;
    });

    const id = "lyr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const entry = { id, name, layer, color, count };
    uploads.push(entry);
    renderLayerList();
    try {
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 16 });
    } catch (e) {}
    setStatus("Loaded " + count + " feature" + (count === 1 ? "" : "s") + " from “" + name + "”.");
  }

  function removeUpload(id) {
    const i = uploads.findIndex((u) => u.id === id);
    if (i < 0) return;
    map.removeLayer(uploads[i].layer);
    uploads.splice(i, 1);
    renderLayerList();
    setStatus(uploads.length ? uploads.length + " layer(s) remaining." : "All layers removed.");
  }

  function renderLayerList() {
    layerList.innerHTML = "";
    for (const u of uploads) {
      const li = document.createElement("li");
      li.className = "layer-item";
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = u.color;
      const mid = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "name";
      nm.textContent = u.name;
      nm.title = u.name;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = u.count + " feature" + (u.count === 1 ? "" : "s");
      mid.append(nm, meta);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "Remove";
      rm.setAttribute("aria-label", "Remove " + u.name);
      rm.addEventListener("click", () => removeUpload(u.id));
      li.append(sw, mid, rm);
      layerList.appendChild(li);
    }
  }

  function fitAll() {
    if (!uploads.length) {
      map.setView([28.2, 84.0], 7);
      return;
    }
    const group = L.featureGroup(uploads.map((u) => u.layer));
    try {
      const b = group.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 16 });
    } catch (e) {}
  }

  function clearAll() {
    uploads.slice().forEach((u) => removeUpload(u.id));
    setStatus("Cleared.");
  }

  /* ---------- file load ---------- */
  function readFile(file) {
    if (!file) return;
    const name = file.name || "upload.geojson";
    if (file.size > 25 * 1024 * 1024) {
      setStatus("File is larger than 25 MB. Try a smaller GeoJSON.", true);
      return;
    }
    setStatus("Reading “" + name + "”…");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || (data.type !== "FeatureCollection" && data.type !== "Feature" && data.type !== "GeometryCollection")) {
          if (!data.type || !/Point|LineString|Polygon|Multi/i.test(data.type)) {
            throw new Error("Not a GeoJSON Feature, FeatureCollection, or geometry.");
          }
        }
        const fc =
          data.type === "FeatureCollection"
            ? data
            : data.type === "Feature"
              ? { type: "FeatureCollection", features: [data] }
              : { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: data }] };
        if (!fc.features || !fc.features.length) throw new Error("No features found in this file.");
        addGeoJSON(fc, name);
      } catch (err) {
        setStatus("Could not read file: " + (err.message || "invalid GeoJSON"), true);
      }
    };
    reader.onerror = () => setStatus("Failed to read the file.", true);
    reader.readAsText(file);
  }

  const drop = $("dropzone");
  const fileInput = $("file");

  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => {
    const f = fileInput.files && fileInput.files[0];
    readFile(f);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.add("drag");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove("drag");
    });
  });
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    readFile(f);
  });

  /* ---------- export ---------- */
  function waitTiles(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function captureMap() {
    map.invalidateSize();
    await waitTiles(400);
    const node = $("map");
    const canvas = await html2canvas(node, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#dbe4ea",
      logging: false,
      scale: Math.min(2, window.devicePixelRatio || 1),
    });
    return canvas;
  }

  function stampFilename(ext) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return (
      "gis-map-" +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      "-" +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      "." +
      ext
    );
  }

  $("btn-png").addEventListener("click", async () => {
    setStatus("Capturing PNG…");
    try {
      const canvas = await captureMap();
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = stampFilename("png");
      a.click();
      setStatus("PNG downloaded.");
    } catch (err) {
      setStatus("PNG export failed. Try the OpenStreetMap or Carto basemap.", true);
    }
  });

  $("btn-pdf").addEventListener("click", async () => {
    setStatus("Capturing PDF…");
    try {
      const canvas = await captureMap();
      const img = canvas.toDataURL("image/jpeg", 0.92);
      const { jsPDF } = window.jspdf;
      const w = canvas.width;
      const h = canvas.height;
      const orient = w >= h ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation: orient, unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2 - 28;
      const scale = Math.min(maxW / w, maxH / h);
      const dw = w * scale;
      const dh = h * scale;
      const x = (pageW - dw) / 2;
      const y = margin + 18;
      pdf.setFontSize(11);
      pdf.setTextColor(40);
      pdf.text("GIS map export – Nepali Utilities", margin, margin + 8);
      pdf.addImage(img, "JPEG", x, y, dw, dh);
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(activeBase ? activeBase.attr : "", margin, pageH - 12);
      pdf.save(stampFilename("pdf"));
      setStatus("PDF downloaded.");
    } catch (err) {
      setStatus("PDF export failed. Try the OpenStreetMap or Carto basemap.", true);
    }
  });

  $("btn-fit").addEventListener("click", fitAll);
  $("btn-clear").addEventListener("click", clearAll);

  setTimeout(() => map.invalidateSize(), 200);
  window.addEventListener("resize", () => map.invalidateSize());
})();
