(() => {
  "use strict";

  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  const NEPAL_BOUNDS = [
    [26.35, 80.05],
    [30.48, 88.25]
  ];

  const state = {
    stations: [],
    filtered: [],
    userLocation: null,
    activeId: null,
    map: null,
    cluster: null,
    markers: new Map()
  };

  const el = id => document.getElementById(id);

  const map = L.map("map", {
    zoomControl: true,
    preferCanvas: true
  }).fitBounds(NEPAL_BOUNDS);

  state.map = map;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  state.cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 14,
    maxClusterRadius: 45
  });

  map.addLayer(state.cluster);

  const OVERPASS_QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="NP"]["boundary"="administrative"]->.nepal;
(
  nwr["amenity"="charging_station"](area.nepal);
  nwr["man_made"="charge_point"](area.nepal);
  nwr["amenity"="fuel"]["fuel:electricity"="yes"](area.nepal);
);
out center tags;
`;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function firstTag(tags, keys) {
    for (const key of keys) {
      if (tags?.[key]) return tags[key];
    }
    return "";
  }

  function getCoords(item) {
    if (typeof item.lat === "number" && typeof item.lon === "number") {
      return [item.lat, item.lon];
    }
    if (item.center &&
        typeof item.center.lat === "number" &&
        typeof item.center.lon === "number") {
      return [item.center.lat, item.center.lon];
    }
    return null;
  }

  function provinceFromTags(tags) {
    return firstTag(tags, [
      "addr:province",
      "addr:state",
      "province",
      "state"
    ]) || "Not specified";
  }

  function normalize(item) {
    const tags = item.tags || {};
    const coords = getCoords(item);
    if (!coords) return null;

    const name = firstTag(tags, [
      "name",
      "official_name",
      "operator",
      "brand"
    ]) || "EV Charging Station";

    const operator = firstTag(tags, ["operator", "brand"]);
    const address = firstTag(tags, [
      "addr:full",
      "addr:street",
      "addr:place",
      "addr:city",
      "description"
    ]);

    const accessRaw = String(firstTag(tags, ["access", "fee:conditional"]) || "").toLowerCase();
    const access = accessRaw === "private" || accessRaw === "customers"
      ? "private"
      : accessRaw === "yes" || accessRaw === "public"
        ? "public"
        : "unknown";

    const socketText = Object.entries(tags)
      .filter(([k]) => /socket|connector|charging|output|power/i.test(k))
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")
      .toLowerCase();

    const powerText = `${socketText} ${tags.power || ""} ${tags["capacity:charging"] || ""}`.toLowerCase();

    const isDC =
      /ccs|chademo|gb\/?t|dc_fast|dcfc|direct.?current|fast.?charg|dc\b/.test(powerText);

    const isAC =
      /type ?2|type ?1|mennekes|ac\b|alternating.?current/.test(powerText);

    const type = isDC ? "dc" : isAC ? "ac" : "unknown";

    const capacity = firstTag(tags, [
      "capacity",
      "capacity:charging",
      "capacity:electricity"
    ]);

    const openingHours = firstTag(tags, ["opening_hours"]);
    const phone = firstTag(tags, ["phone", "contact:phone"]);
    const website = firstTag(tags, ["website", "contact:website"]);

    const osmUrl = `https://www.openstreetmap.org/${item.type}/${item.id}`;

    return {
      id: `${item.type}/${item.id}`,
      osmId: item.id,
      osmType: item.type,
      lat: coords[0],
      lon: coords[1],
      name,
      operator,
      address,
      province: provinceFromTags(tags),
      access,
      type,
      capacity,
      openingHours,
      phone,
      website,
      tags,
      osmUrl
    };
  }

  function deduplicate(stations) {
    const seen = new Map();

    for (const station of stations) {
      const key = [
        station.name.trim().toLowerCase(),
        station.lat.toFixed(5),
        station.lon.toFixed(5)
      ].join("|");

      if (!seen.has(key)) {
        seen.set(key, station);
      }
    }

    return [...seen.values()];
  }

  async function fetchOverpass() {
    let lastError = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: "data=" + encodeURIComponent(OVERPASS_QUERY),
          signal: AbortSignal.timeout(135000)
        });

        if (!response.ok) {
          throw new Error(`Overpass returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.elements)) {
          throw new Error("Unexpected Overpass response");
        }

        return data.elements;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to contact Overpass API");
  }

  async function loadStations() {
    setStatus("Loading OpenStreetMap data…");
    el("errorBox").style.display = "none";
    el("stationList").innerHTML = '<div class="loading">Querying OpenStreetMap through Overpass…</div>';

    try {
      const elements = await fetchOverpass();

      state.stations = deduplicate(
        elements
          .map(normalize)
          .filter(Boolean)
      );

      populateProvinceFilter();
      updateResults();

      setStatus(`Loaded ${state.stations.length} mapped station${state.stations.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      el("errorBox").textContent =
        "Could not load charging stations right now. Overpass may be busy; please try Refresh Data in a moment.";
      el("errorBox").style.display = "block";
      el("stationList").innerHTML =
        '<div class="empty">Unable to load charging stations.</div>';
      setStatus("Data request failed.");
      el("countStat").textContent = "Data unavailable";
    }
  }

  function populateProvinceFilter() {
    const select = el("provinceFilter");
    const current = select.value;

    const provinces = [...new Set(
      state.stations
        .map(s => s.province)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    select.innerHTML = '<option value="">All provinces</option>';

    for (const province of provinces) {
      const option = document.createElement("option");
      option.value = province;
      option.textContent = province;
      select.appendChild(option);
    }

    if (provinces.includes(current)) {
      select.value = current;
    }
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = x => x * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function applyFilters() {
    const search = el("searchInput").value.trim().toLowerCase();
    const province = el("provinceFilter").value;
    const type = el("typeFilter").value;
    const access = el("accessFilter").value;

    let result = state.stations.filter(station => {
      const searchable = [
        station.name,
        station.operator,
        station.address,
        station.province,
        station.type,
        station.capacity,
        Object.values(station.tags || {}).join(" ")
      ].join(" ").toLowerCase();

      if (search && !searchable.includes(search)) return false;
      if (province && station.province !== province) return false;
      if (type && station.type !== type) return false;
      if (access && station.access !== access) return false;

      return true;
    });

    if (state.userLocation) {
      result = result.map(station => ({
        ...station,
        distance: distanceKm(
          state.userLocation.lat,
          state.userLocation.lon,
          station.lat,
          station.lon
        )
      })).sort((a, b) => a.distance - b.distance);
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    state.filtered = result;
  }

  function updateResults() {
    applyFilters();
    renderMarkers();
    renderList();

    el("countStat").textContent =
      `${state.filtered.length} of ${state.stations.length} station${state.stations.length === 1 ? "" : "s"}`;

    el("listSummary").textContent =
      state.userLocation
        ? `${state.filtered.length} stations, nearest first`
        : `${state.filtered.length} stations shown`;
  }

  function markerIcon(type) {
    const background =
      type === "dc" ? "#e49a35" :
      type === "ac" ? "#3d8fa5" :
      "#5f7e89";

    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:34px;
          height:34px;
          border-radius:50%;
          background:${background};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.28);
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:17px;
        ">⚡</div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17]
    });
  }

  function popupHtml(station) {
    const mapsUrl =
      `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`;

    const turboUrl =
      `https://overpass-turbo.eu/?C=${encodeURIComponent(
        `${station.lon},${station.lat},15`
      )}`;

    return `
      <div class="detail">
        <h3>${esc(station.name)}</h3>
        ${station.operator ? `<p><strong>Operator:</strong> ${esc(station.operator)}</p>` : ""}
        ${station.address ? `<p><strong>Address:</strong> ${esc(station.address)}</p>` : ""}
        <p><strong>Province:</strong> ${esc(station.province)}</p>
        <div class="badges">
          <span class="badge">${station.type === "dc" ? "DC / Fast" : station.type === "ac" ? "AC" : "Type not specified"}</span>
          <span class="badge">${station.access === "public" ? "Public" : station.access === "private" ? "Private" : "Access not specified"}</span>
          ${station.capacity ? `<span class="badge">${esc(station.capacity)} capacity</span>` : ""}
        </div>
        ${station.openingHours ? `<p><strong>Hours:</strong> ${esc(station.openingHours)}</p>` : ""}
        ${station.phone ? `<p><strong>Phone:</strong> ${esc(station.phone)}</p>` : ""}
        <div class="detail-actions">
          <a href="${mapsUrl}" target="_blank" rel="noopener">🧭 Navigate</a>
          <a href="${station.osmUrl}" target="_blank" rel="noopener">🗺 OSM</a>
          <a href="${turboUrl}" target="_blank" rel="noopener">⚡ Turbo</a>
          ${station.website ? `<a href="${esc(station.website)}" target="_blank" rel="noopener">🌐 Website</a>` : ""}
        </div>
      </div>
    `;
  }

  function renderMarkers() {
    state.cluster.clearLayers();
    state.markers.clear();

    const markers = [];

    for (const station of state.filtered) {
      const marker = L.marker(
        [station.lat, station.lon],
        { icon: markerIcon(station.type) }
      );

      marker.bindPopup(popupHtml(station));
      marker.on("click", () => {
        state.activeId = station.id;
        highlightListItem(station.id);
      });

      state.markers.set(station.id, marker);
      markers.push(marker);
    }

    state.cluster.addLayers(markers);
  }

  function renderList() {
    const list = el("stationList");

    if (!state.filtered.length) {
      list.innerHTML = `
        <div class="empty">
          <strong>No stations found.</strong>
          <br>
          Try clearing the filters or searching for another location.
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const station of state.filtered) {
      const item = document.createElement("div");
      item.className = "station-item";
      item.dataset.id = station.id;

      const distance =
        typeof station.distance === "number"
          ? `<div class="station-meta">📍 ${station.distance.toFixed(1)} km away</div>`
          : "";

      item.innerHTML = `
        <div class="station-name">${esc(station.name)}</div>
        ${station.operator ? `<div class="station-meta">${esc(station.operator)}</div>` : ""}
        ${station.address ? `<div class="station-meta">${esc(station.address)}</div>` : ""}
        ${distance}
        <div class="badges">
          <span class="badge ${station.type === "dc" ? "dc" : ""}">
            ${station.type === "dc" ? "DC / Fast" : station.type === "ac" ? "AC" : "Charging"}
          </span>
          ${station.access === "public" ? '<span class="badge open">Public</span>' : ""}
          ${station.capacity ? `<span class="badge">${esc(station.capacity)}</span>` : ""}
        </div>
      `;

      item.addEventListener("click", () => focusStation(station));
      fragment.appendChild(item);
    }

    list.innerHTML = "";
    list.appendChild(fragment);
  }

  function highlightListItem(id) {
    document.querySelectorAll(".station-item").forEach(item => {
      item.classList.toggle("active", item.dataset.id === id);
    });
  }

  function focusStation(station) {
    state.activeId = station.id;
    highlightListItem(station.id);

    map.setView([station.lat, station.lon], Math.max(map.getZoom(), 15), {
      animate: true
    });

    const marker = state.markers.get(station.id);
    if (marker) {
      setTimeout(() => marker.openPopup(), 150);
    }
  }

  function locateUser() {
    if (!navigator.geolocation) {
      el("errorBox").textContent = "Your browser does not support location services.";
      el("errorBox").style.display = "block";
      return;
    }

    el("locateBtn").disabled = true;
    el("locateBtn").textContent = "📍 Finding location…";

    navigator.geolocation.getCurrentPosition(
      position => {
        state.userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };

        const radius = 1500;
        L.circle([state.userLocation.lat, state.userLocation.lon], {
          radius,
          color: "#236b82",
          fillOpacity: 0.08,
          weight: 1
        }).addTo(map);

        L.circleMarker(
          [state.userLocation.lat, state.userLocation.lon],
          {
            radius: 7,
            color: "#236b82",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 3
          }
        ).addTo(map).bindPopup("Your approximate location").openPopup();

        map.setView(
          [state.userLocation.lat, state.userLocation.lon],
          12
        );

        el("nearStat").textContent = "Sorted by distance";
        updateResults();

        el("locateBtn").disabled = false;
        el("locateBtn").textContent = "📍 Find Near Me";
      },
      error => {
        const message =
          error.code === 1
            ? "Location permission was denied."
            : "Unable to determine your location.";

        el("errorBox").textContent = message;
        el("errorBox").style.display = "block";

        el("locateBtn").disabled = false;
        el("locateBtn").textContent = "📍 Find Near Me";
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  function clearFilters() {
    el("searchInput").value = "";
    el("provinceFilter").value = "";
    el("typeFilter").value = "";
    el("accessFilter").value = "";
    updateResults();
  }

  function showNepal() {
    map.fitBounds(NEPAL_BOUNDS, {
      padding: [20, 20]
    });
  }

  function setStatus(text) {
    el("mapStatus").textContent = text;
  }

  function openOverpassTurbo() {
    const url =
      "https://overpass-turbo.eu/?Q=" +
      encodeURIComponent(OVERPASS_QUERY.trim());

    window.open(url, "_blank", "noopener");
  }

  el("searchInput").addEventListener("input", updateResults);
  el("provinceFilter").addEventListener("change", updateResults);
  el("typeFilter").addEventListener("change", updateResults);
  el("accessFilter").addEventListener("change", updateResults);
  el("clearBtn").addEventListener("click", clearFilters);
  el("locateBtn").addEventListener("click", locateUser);
  el("nepalBtn").addEventListener("click", showNepal);
  el("refreshBtn").addEventListener("click", loadStations);
  el("turboBtn").addEventListener("click", event => {
    event.preventDefault();
    openOverpassTurbo();
  });

  loadStations();
})();
