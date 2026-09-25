(() => {
"use strict";
function byId(id) {
return document.getElementById(id);
}
const statusEl = byId("status");
const layerList = byId("layer-list");
const creditEl = byId("map-credit");
const legendEl = byId("map-legend");
function setStatus(msg, isError) {
statusEl.textContent = msg || "";
statusEl.classList.toggle("error", !!isError);
}
const BASEMAPS = [
{
id: "osm",
name: "OpenStreetMap",
url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
attr: "© OpenStreetMap contributors",
maxZoom: 19
},
{
id: "carto-light",
name: "Carto Light",
url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
attr: "© OpenStreetMap © CARTO",
maxZoom: 20
},
{
id: "carto-dark",
name: "Carto Dark",
url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
attr: "© OpenStreetMap © CARTO",
maxZoom: 20
},
{
id: "topo",
name: "OpenTopoMap",
url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
attr: "© OpenStreetMap © OpenTopoMap (CC-BY-SA)",
maxZoom: 17
}
];
const map = window.L.map("map", {
center: [28.2, 84.0],
zoom: 7,
zoomControl: true,
attributionControl: true
});
const baseLayers = {};
let activeBase = null;
BASEMAPS.forEach(function (b, i) {
const layer = window.L.tileLayer(b.url, {
attribution: b.attr,
maxZoom: b.maxZoom,
crossOrigin: true
});
baseLayers[b.id] = layer;
if (i === 0) {
layer.addTo(map);
activeBase = b;
creditEl.textContent = b.attr;
}
});
const basemapList = byId("basemap-list");
BASEMAPS.forEach(function (b, i) {
const label = document.createElement("label");
const input = document.createElement("input");
input.type = "radio";
input.name = "basemap";
input.value = b.id;
if (i === 0) input.checked = true;
input.addEventListener("change", function () {
if (!input.checked) return;
Object.keys(baseLayers).forEach(function (key) {
map.removeLayer(baseLayers[key]);
});
baseLayers[b.id].addTo(map);
activeBase = b;
creditEl.textContent = b.attr;
});
label.appendChild(input);
label.appendChild(document.createTextNode(b.name));
basemapList.appendChild(label);
});
const SOLID = ["#0b6e4f", "#1d4ed8", "#b45309", "#9f1239", "#6d28d9", "#0e7490", "#4d7c0f"];
let colorIdx = 0;
function nextSolid() {
const col = SOLID[colorIdx % SOLID.length];
colorIdx += 1;
return col;
}
const GRAD = [
[237, 248, 251],
[178, 226, 226],
[102, 194, 164],
[44, 162, 95],
[0, 109, 44]
];
function lerpColor(t) {
t = Math.max(0, Math.min(1, t));
const n = GRAD.length - 1;
const x = t * n;
const i = Math.min(n - 1, Math.floor(x));
const f = x - i;
const a = GRAD[i];
const b = GRAD[i + 1];
return (
"rgb(" +
Math.round(a[0] + (b[0] - a[0]) * f) +
"," +
Math.round(a[1] + (b[1] - a[1]) * f) +
"," +
Math.round(a[2] + (b[2] - a[2]) * f) +
")"
);
}
function escapeHtml(s) {
return String(s)
.replace(/&/g, "&" + "amp;")
.replace(/</g, "&" + "lt;")
.replace(/>/g, "&" + "gt;")
.replace(/"/g, "&" + "quot;");
}
function popupHtml(props) {
if (!props || !Object.keys(props).length) return "<em>No attributes</em>";
const keys = Object.keys(props).slice(0, 30);
let rows = "";
for (let i = 0; i < keys.length; i++) {
const k = keys[i];
const v = props[k];
const text = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
rows += "<tr><td>" + escapeHtml(k) + "</td><td>" + escapeHtml(text) + "</td></tr>";
}
return "<table>" + rows + "</table>";
}
const uploads = [];
let csvState = null;
function collectPropKeys(geojson) {
const keys = {};
const feats = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
for (let i = 0; i < feats.length; i++) {
const f = feats[i];
if (f && f.properties) {
const pk = Object.keys(f.properties);
for (let j = 0; j < pk.length; j++) keys[pk[j]] = true;
}
}
return Object.keys(keys).sort();
}
function styleSolid(color) {
return { color: color, weight: 1.5, opacity: 0.9, fillColor: color, fillOpacity: 0.28 };
}
function addGeoJSON(geojson, name) {
const color = nextSolid();
const propKeys = collectPropKeys(geojson);
const layer = window.L.geoJSON(geojson, {
style: function () {
return styleSolid(color);
},
pointToLayer: function (f, ll) {
return window.L.circleMarker(ll, {
radius: 7,
color: color,
weight: 2,
fillColor: color,
fillOpacity: 0.7
});
},
onEachFeature: function (feature, lyr) {
lyr.bindPopup(function () {
return popupHtml(feature.properties || {});
}, { maxWidth: 300 });
}
});
layer.addTo(map);
let count = 0;
layer.eachLayer(function () {
count += 1;
});
const id = "lyr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
uploads.push({
id: id,
name: name,
layer: layer,
geojson: geojson,
color: color,
count: count,
propKeys: propKeys,
choropleth: null
});
renderLayerList();
refreshJoinUI();
try {
const b = layer.getBounds();
if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 16 });
} catch (err) {}
setStatus("Loaded " + count + " feature" + (count === 1 ? "" : "s") + " from " + name + ".");
}
function removeUpload(id) {
let i = -1;
for (let j = 0; j < uploads.length; j++) {
if (uploads[j].id === id) {
i = j;
break;
}
}
if (i < 0) return;
map.removeLayer(uploads[i].layer);
uploads.splice(i, 1);
renderLayerList();
refreshJoinUI();
let hasChoro = false;
for (let j = 0; j < uploads.length; j++) {
if (uploads[j].choropleth) hasChoro = true;
}
if (!hasChoro) legendEl.style.display = "none";
setStatus(uploads.length ? uploads.length + " layer(s) remaining." : "All layers removed.");
}
function renderLayerList() {
layerList.innerHTML = "";
for (let i = 0; i < uploads.length; i++) {
const u = uploads[i];
const li = document.createElement("li");
li.className = "layer-item";
const sw = document.createElement("span");
sw.className = "swatch";
sw.style.background = u.choropleth
? "linear-gradient(90deg,#edf8fb,#006d2c)"
: u.color;
const mid = document.createElement("div");
const nm = document.createElement("div");
nm.className = "name";
nm.textContent = u.name;
nm.title = u.name;
const meta = document.createElement("div");
meta.className = "meta";
meta.textContent =
u.count +
" feature" +
(u.count === 1 ? "" : "s") +
(u.choropleth ? " · gradient" : "");
mid.appendChild(nm);
mid.appendChild(meta);
const rm = document.createElement("button");
rm.type = "button";
rm.textContent = "Remove";
(function (uid) {
rm.addEventListener("click", function () {
removeUpload(uid);
});
})(u.id);
li.appendChild(sw);
li.appendChild(mid);
li.appendChild(rm);
layerList.appendChild(li);
}
}
function fitAll() {
if (!uploads.length) {
map.setView([28.2, 84.0], 7);
return;
}
const layers = [];
for (let i = 0; i < uploads.length; i++) layers.push(uploads[i].layer);
const group = window.L.featureGroup(layers);
try {
const b = group.getBounds();
if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 16 });
} catch (err) {}
}
function clearAll() {
const copy = uploads.slice();
for (let i = 0; i < copy.length; i++) removeUpload(copy[i].id);
csvState = null;
byId("join-fields").style.display = "none";
legendEl.style.display = "none";
setStatus("Cleared.");
}
function parseCSV(text) {
const rows = [];
let row = [];
let cell = "";
let i = 0;
let inQ = false;
const s = text.replace(/^\uFEFF/, "");
while (i < s.length) {
const ch = s[i];
if (inQ) {
if (ch === '"') {
if (s[i + 1] === '"') {
cell += '"';
i += 2;
continue;
}
inQ = false;
i += 1;
continue;
}
cell += ch;
i += 1;
continue;
}
if (ch === '"') {
inQ = true;
i += 1;
continue;
}
if (ch === ",") {
row.push(cell);
cell = "";
i += 1;
continue;
}
if (ch === "\n" || ch === "\r") {
if (ch === "\r" && s[i + 1] === "\n") i += 1;
row.push(cell);
cell = "";
let nonempty = false;
for (let k = 0; k < row.length; k++) {
if (row[k].trim() !== "") nonempty = true;
}
if (nonempty) rows.push(row);
row = [];
i += 1;
continue;
}
cell += ch;
i += 1;
}
row.push(cell);
let nonempty = false;
for (let k = 0; k < row.length; k++) {
if (row[k].trim() !== "") nonempty = true;
}
if (nonempty) rows.push(row);
if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row.");
const headers = [];
for (let h = 0; h < rows[0].length; h++) headers.push(rows[0][h].trim());
const data = [];
for (let r = 1; r < rows.length; r++) {
const o = {};
for (let h = 0; h < headers.length; h++) {
o[headers[h]] = (rows[r][h] != null ? rows[r][h] : "").trim();
}
data.push(o);
}
return { headers: headers, rows: data };
}
function loadCSV(file) {
if (!file) return;
if (file.size > 15 * 1024 * 1024) {
setStatus("CSV larger than 15 MB. Try a smaller file.", true);
return;
}
setStatus("Reading CSV " + file.name + "…");
const reader = new FileReader();
reader.onload = function () {
try {
const parsed = parseCSV(String(reader.result || ""));
csvState = { name: file.name, headers: parsed.headers, rows: parsed.rows };
refreshJoinUI();
setStatus(
"CSV loaded: " +
parsed.rows.length +
" row" +
(parsed.rows.length === 1 ? "" : "s") +
", " +
parsed.headers.length +
" columns. Choose join fields and Apply gradient."
);
} catch (err) {
setStatus("Could not parse CSV: " + (err.message || "invalid"), true);
}
};
reader.onerror = function () {
setStatus("Failed to read CSV.", true);
};
reader.readAsText(file);
}
function fillSelect(el, options, selected) {
el.innerHTML = "";
if (!options.length) {
const o = document.createElement("option");
o.value = "";
o.textContent = "— none —";
el.appendChild(o);
return;
}
for (let i = 0; i < options.length; i++) {
const opt = options[i];
const o = document.createElement("option");
o.value = opt.value;
o.textContent = opt.label;
if (selected != null && String(opt.value) === String(selected)) o.selected = true;
el.appendChild(o);
}
}
function guessKey(keys) {
const preferred = [
"id", "ID", "code", "CODE", "name", "NAME",
"district", "District", "vdc", "ward", "Ward",
"municipality", "palika"
];
for (let i = 0; i < preferred.length; i++) {
if (keys.indexOf(preferred[i]) >= 0) return preferred[i];
}
return keys.length ? keys[0] : "";
}
function guessNumeric(headers, rows) {
if (!headers || !headers.length) return "";
if (!rows || !rows.length) return headers[headers.length - 1] || "";
for (let h = 0; h < headers.length; h++) {
const name = headers[h];
let nums = 0;
let checked = 0;
const limit = Math.min(rows.length, 40);
for (let i = 0; i < limit; i++) {
const v = rows[i][name];
if (v === "" || v == null) continue;
checked += 1;
if (/^-?\d+(\.\d+)?$/.test(String(v).replace(/,/g, ""))) nums += 1;
}
if (checked > 0 && nums / checked > 0.7) return name;
}
return headers[headers.length - 1] || "";
}
function refreshJoinUI() {
const box = byId("join-fields");
if (!csvState || !uploads.length) {
box.style.display = "none";
return;
}
box.style.display = "flex";
const layerOpts = [];
for (let i = 0; i < uploads.length; i++) {
const u = uploads[i];
layerOpts.push({ value: u.id, label: u.name + " (" + u.count + ")" });
}
fillSelect(byId("map-layer"), layerOpts, uploads[uploads.length - 1].id);
const activeLayerId = byId("map-layer").value;
let active = uploads[uploads.length - 1];
for (let i = 0; i < uploads.length; i++) {
if (uploads[i].id === activeLayerId) active = uploads[i];
}
const mapKeys = active.propKeys.length ? active.propKeys : ["(no properties)"];
const mapKeyOpts = [];
for (let i = 0; i < mapKeys.length; i++) {
mapKeyOpts.push({ value: mapKeys[i], label: mapKeys[i] });
}
fillSelect(byId("map-key"), mapKeyOpts, guessKey(active.propKeys));
const csvKeyOpts = [];
const csvValOpts = [];
for (let i = 0; i < csvState.headers.length; i++) {
const h = csvState.headers[i];
csvKeyOpts.push({ value: h, label: h });
csvValOpts.push({ value: h, label: h });
}
fillSelect(byId("csv-key"), csvKeyOpts, guessKey(csvState.headers));
const guessedVal = guessNumeric(csvState.headers, csvState.rows);
fillSelect(byId("csv-value"), csvValOpts, guessedVal);
}
byId("map-layer").addEventListener("change", function () {
let active = null;
const id = byId("map-layer").value;
for (let i = 0; i < uploads.length; i++) {
if (uploads[i].id === id) active = uploads[i];
}
if (!active) return;
const opts = [];
for (let i = 0; i < active.propKeys.length; i++) {
opts.push({ value: active.propKeys[i], label: active.propKeys[i] });
}
fillSelect(byId("map-key"), opts, guessKey(active.propKeys));
});
function normalizeKey(v) {
return String(v == null ? "" : v)
.trim()
.toLowerCase()
.replace(/^0+(\d)/, "$1");
}
function parseNum(v) {
if (v == null || v === "") return NaN;
const n = Number(String(v).replace(/,/g, "").trim());
return Number.isFinite(n) ? n : NaN;
}
function formatNum(n) {
if (!Number.isFinite(n)) return "—";
if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
if (Number.isInteger(n)) return String(n);
return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
function applyGradient() {
if (!csvState) {
setStatus("Upload a CSV first.", true);
return;
}
const layerId = byId("map-layer").value;
const mapKey = byId("map-key").value;
const csvKey = byId("csv-key").value;
const valueKey = byId("csv-value").value;
let entry = null;
for (let i = 0; i < uploads.length; i++) {
if (uploads[i].id === layerId) entry = uploads[i];
}
if (!entry) {
setStatus("Select a map layer.", true);
return;
}
if (!mapKey || mapKey === "(no properties)") {
setStatus("Map features need a property field to join on.", true);
return;
}
if (!valueKey) {
setStatus("Select a CSV value field.", true);
return;
}
const lookup = {};
for (let i = 0; i < csvState.rows.length; i++) {
const row = csvState.rows[i];
const k = normalizeKey(row[csvKey]);
if (!k) continue;
const n = parseNum(row[valueKey]);
if (!Number.isFinite(n)) continue;
lookup[k] = n;
}
const lookupKeys = Object.keys(lookup);
if (!lookupKeys.length) {
setStatus("No numeric values found in the CSV value column.", true);
return;
}
const matched = [];
entry.layer.eachLayer(function (lyr) {
const props = (lyr.feature && lyr.feature.properties) || {};
const k = normalizeKey(props[mapKey]);
if (Object.prototype.hasOwnProperty.call(lookup, k)) matched.push(lookup[k]);
});
if (!matched.length) {
setStatus("No matching IDs between map field and CSV field. Check both fields.", true);
return;
}
let min = matched[0];
let max = matched[0];
for (let i = 1; i < matched.length; i++) {
if (matched[i] < min) min = matched[i];
if (matched[i] > max) max = matched[i];
}
const span = max - min || 1;
entry.layer.eachLayer(function (lyr) {
const props = (lyr.feature && lyr.feature.properties) || {};
const k = normalizeKey(props[mapKey]);
const has = Object.prototype.hasOwnProperty.call(lookup, k);
const val = has ? lookup[k] : null;
if (val != null) props["_value"] = val;
else delete props["_value"];
if (val == null) {
if (lyr.setStyle) {
lyr.setStyle({
color: "#94a3b8",
weight: 1,
opacity: 0.6,
fillColor: "#cbd5e1",
fillOpacity: 0.15
});
}
return;
}
const t = (val - min) / span;
const col = lerpColor(t);
if (lyr.setStyle) {
lyr.setStyle({
color: col,
weight: 1.2,
opacity: 0.95,
fillColor: col,
fillOpacity: 0.72
});
}
});
entry.choropleth = {
min: min,
max: max,
mapKey: mapKey,
csvKey: csvKey,
valueKey: valueKey,
matched: matched.length
};
renderLayerList();
byId("legend-title").textContent = valueKey;
byId("legend-min").textContent = formatNum(min);
byId("legend-max").textContent = formatNum(max);
legendEl.style.display = "block";
setStatus(
"Gradient applied: " +
matched.length +
" of " +
entry.count +
" features matched. Grey = no match."
);
}
byId("btn-join").addEventListener("click", applyGradient);
function wireDrop(zoneId, inputId, handler) {
const zone = byId(zoneId);
const input = byId(inputId);
zone.addEventListener("click", function () {
input.click();
});
zone.addEventListener("keydown", function (e) {
if (e.key === "Enter" || e.key === " ") {
e.preventDefault();
input.click();
}
});
input.addEventListener("change", function () {
const f = input.files && input.files[0];
handler(f);
input.value = "";
});
["dragenter", "dragover"].forEach(function (ev) {
zone.addEventListener(ev, function (e) {
e.preventDefault();
e.stopPropagation();
zone.classList.add("drag");
});
});
["dragleave", "drop"].forEach(function (ev) {
zone.addEventListener(ev, function (e) {
e.preventDefault();
e.stopPropagation();
zone.classList.remove("drag");
});
});
zone.addEventListener("drop", function (e) {
const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
handler(f);
});
}
function readGeoFile(file) {
if (!file) return;
const name = file.name || "upload.geojson";
if (file.size > 25 * 1024 * 1024) {
setStatus("GeoJSON larger than 25 MB.", true);
return;
}
setStatus("Reading " + name + "…");
const reader = new FileReader();
reader.onload = function () {
try {
const data = JSON.parse(reader.result);
let fc;
if (data.type === "FeatureCollection") fc = data;
else if (data.type === "Feature") fc = { type: "FeatureCollection", features: [data] };
else if (data.type && /Point|LineString|Polygon|Multi|GeometryCollection/i.test(data.type)) {
fc = {
type: "FeatureCollection",
features: [{ type: "Feature", properties: {}, geometry: data }]
};
} else throw new Error("Not valid GeoJSON.");
if (!fc.features || !fc.features.length) throw new Error("No features found.");
addGeoJSON(fc, name);
} catch (err) {
setStatus("Could not read GeoJSON: " + (err.message || "invalid"), true);
}
};
reader.onerror = function () {
setStatus("Failed to read file.", true);
};
reader.readAsText(file);
}
wireDrop("drop-geo", "file-geo", readGeoFile);
wireDrop("drop-csv", "file-csv", loadCSV);
function waitTiles(ms) {
return new Promise(function (resolve) {
setTimeout(resolve, ms);
});
}
function captureMap() {
map.invalidateSize();
return waitTiles(400).then(function () {
return html2canvas(byId("map"), {
useCORS: true,
allowTaint: false,
backgroundColor: "#dbe4ea",
logging: false,
scale: Math.min(2, window.devicePixelRatio || 1)
});
});
}
function stampFilename(ext) {
const d = new Date();
function pad(n) {
return String(n).padStart(2, "0");
}
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
byId("btn-png").addEventListener("click", function () {
setStatus("Capturing PNG…");
captureMap()
.then(function (canvas) {
const a = document.createElement("a");
a.href = canvas.toDataURL("image/png");
a.download = stampFilename("png");
a.click();
setStatus("PNG downloaded.");
})
.catch(function () {
setStatus("PNG export failed. Try OpenStreetMap or Carto basemap.", true);
});
});
byId("btn-pdf").addEventListener("click", function () {
setStatus("Capturing PDF…");
captureMap()
.then(function (canvas) {
const img = canvas.toDataURL("image/jpeg", 0.92);
const jsPDF = window.jspdf.jsPDF;
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
pdf.setFontSize(11);
pdf.setTextColor(40);
pdf.text("GIS map export - Nepali Utilities", margin, margin + 8);
pdf.addImage(img, "JPEG", (pageW - dw) / 2, margin + 18, dw, dh);
pdf.setFontSize(8);
pdf.setTextColor(120);
pdf.text(activeBase ? activeBase.attr : "", margin, pageH - 12);
pdf.save(stampFilename("pdf"));
setStatus("PDF downloaded.");
})
.catch(function () {
setStatus("PDF export failed. Try OpenStreetMap or Carto basemap.", true);
});
});
byId("btn-fit").addEventListener("click", fitAll);
byId("btn-clear").addEventListener("click", clearAll);
setTimeout(function () {
map.invalidateSize();
}, 200);
window.addEventListener("resize", function () {
map.invalidateSize();
});
})();
