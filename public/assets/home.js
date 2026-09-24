(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  const NPT = "Asia/Kathmandu";
  const ZONES = [
    { city: "Kathmandu", tz: "Asia/Kathmandu" },
    { city: "Doha", tz: "Asia/Qatar" },
    { city: "Dubai", tz: "Asia/Dubai" },
    { city: "Kuala Lumpur", tz: "Asia/Kuala_Lumpur" },
    { city: "Tokyo", tz: "Asia/Tokyo" },
    { city: "Sydney", tz: "Australia/Sydney" },
    { city: "London", tz: "Europe/London" },
    { city: "New York", tz: "America/New_York" },
  ];

  /* ---------- time helpers ---------- */
  const cache = new Map();
  const dtf = (key, tz, opts) => {
    const k = key + "|" + tz;
    if (!cache.has(k)) cache.set(k, new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }));
    return cache.get(k);
  };
  const partsOf = (f, d) => { const o = {}; for (const p of f.formatToParts(d)) o[p.type] = p.value; return o; };
  const nums = (tz, d) => {
    const p = partsOf(dtf("num", tz, { hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }), d);
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second };
  };
  const offsetMin = (tz, d) => {
    const n = nums(tz, d);
    return Math.round((Date.UTC(n.y, n.m - 1, n.d, n.h, n.mi, n.s) - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  };
  const offsetLabel = (m) => {
    const a = Math.abs(m), h = Math.floor(a / 60), mm = a % 60;
    return "UTC" + (m < 0 ? "-" : "+") + h + (mm ? ":" + String(mm).padStart(2, "0") : "");
  };
  const dayKey = (tz, d) => { const n = nums(tz, d); return Date.UTC(n.y, n.m - 1, n.d); };
  const clock = (tz, d, h12, secs) => {
    const f = dtf("clk" + (h12 ? 12 : 24) + (secs ? "s" : ""), tz, {
      hour: h12 ? "numeric" : "2-digit", minute: "2-digit", ...(secs ? { second: "2-digit" } : {}), hourCycle: h12 ? "h12" : "h23",
    });
    const p = partsOf(f, d);
    return { t: p.hour + ":" + p.minute + (secs ? ":" + p.second : ""), ap: h12 ? p.dayPeriod || "" : "" };
  };

  /* ---------- world clocks ---------- */
  let h12 = store.get("fmt", "12") !== "24";
  const list = $("#clock-list");
  const rows = ZONES.map((z) => {
    const li = document.createElement("li");
    li.className = "clock-row" + (z.tz === NPT ? " home" : "");
    const who = document.createElement("div");
    const city = document.createElement("span"); city.className = "city"; city.textContent = z.city;
    const meta = document.createElement("span"); meta.className = "meta";
    who.append(city, meta);
    const when = document.createElement("div");
    const t = document.createElement("span"); t.className = "t";
    const ap = document.createElement("span"); ap.className = "ap";
    when.append(t, ap);
    li.append(who, when);
    list.appendChild(li);
    return { z, meta, t, ap };
  });

  document.querySelectorAll("[data-fmt]").forEach((b) => {
    b.addEventListener("click", () => {
      h12 = b.dataset.fmt === "12";
      store.set("fmt", h12 ? "12" : "24");
      syncFmt(); tick();
    });
  });
  function syncFmt() {
    document.querySelectorAll("[data-fmt]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.fmt === "12") === h12)));
  }

  /* ---------- date widget ---------- */
  const NE_DAYS = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
  let lastDay = "";
  function isoWeek(y, m, d) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
    const start = Date.UTC(dt.getUTCFullYear(), 0, 1);
    return Math.ceil(((dt - start) / 864e5 + 1) / 7);
  }
  function renderDate(now) {
    const n = nums(NPT, now);
    const key = n.y + "-" + n.m + "-" + n.d;
    if (key === lastDay) return;
    lastDay = key;
    const leap = (n.y % 4 === 0 && n.y % 100 !== 0) || n.y % 400 === 0;
    const total = leap ? 366 : 365;
    const doy = Math.round((Date.UTC(n.y, n.m - 1, n.d) - Date.UTC(n.y, 0, 1)) / 864e5) + 1;

    $("#npt-date").textContent = dtf("full", NPT, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(now);
    $("#d-day").textContent = n.d;
    $("#d-weekday").textContent = dtf("wd", NPT, { weekday: "long" }).format(now);
    $("#d-month").textContent = dtf("my", NPT, { month: "long", year: "numeric" }).format(now);
    $("#d-ne").textContent = NE_DAYS[new Date(Date.UTC(n.y, n.m - 1, n.d)).getUTCDay()];
    $("#d-doy").textContent = "Day " + doy + " of " + total;
    $("#d-week").textContent = "Week " + isoWeek(n.y, n.m, n.d);
    $("#d-left").textContent = total - doy + " days left in " + n.y;
    $("#d-bar").style.width = ((doy / total) * 100).toFixed(1) + "%";
    pickQuote(doy);
  }

  function tick() {
    const now = new Date();
    for (const r of rows) {
      const c = clock(r.z.tz, now, h12, false);
      r.t.textContent = c.t; r.ap.textContent = c.ap;
      const diff = Math.round((dayKey(r.z.tz, now) - dayKey(NPT, now)) / 864e5);
      r.meta.textContent = offsetLabel(offsetMin(r.z.tz, now)) + ", " + (diff === 0 ? "today" : diff > 0 ? "tomorrow" : "yesterday");
    }
    const hc = clock(NPT, now, h12, true);
    $("#npt-time").textContent = hc.t;
    $("#npt-ap").textContent = hc.ap;
    renderDate(now);
  }

  /* ---------- quotes (original lines, rotated daily) ---------- */
  const QUOTES = [
    ["आजको सानो प्रयासले भोलिको ठूलो बाटो खुल्छ।", "A small effort today opens a bigger road tomorrow."],
    ["सुरु गर्न पर्खनु पर्दैन, सुरु गरेपछि नै बाटो देखिन्छ।", "You don't have to wait until you're ready. The path shows itself once you begin."],
    ["हिमाल जस्तै अडिग बन, नदी जस्तै अघि बढ।", "Stand firm like a mountain, keep moving like a river."],
    ["हरेक बिहान नयाँ पाना हो, आज के लेख्ने तिमी नै तय गर।", "Every morning is a blank page. You decide what to write today."],
    ["ढिलो भए पनि लगातार हिँड्नेले बाटो गुमाउँदैन।", "Whoever keeps walking, however slowly, does not lose the way."],
    ["गल्ती सिकाइका सिँढी हुन्, तिनलाई डराएर नछोड।", "Mistakes are steps in learning. Don't turn back out of fear of them."],
    ["आजको काम आजै गर्दा भोलिको मन हल्का हुन्छ।", "Finishing today's work today makes tomorrow's mind lighter."],
    ["ठूला सपना सानो-सानो कदमबाट पूरा हुन्छन्।", "Big dreams are completed in small steps."],
    ["धैर्य गर्नेको मिहिनेतले एक दिन फल दिन्छ।", "The patient person's hard work bears fruit one day."],
    ["आफूलाई अरूसँग होइन, हिजोको आफैँसँग तुलना गर।", "Compare yourself not with others, but with who you were yesterday."],
    ["थकाइ लाग्दा रोकिनु ठिकै हो, छोड्नु होइन।", "It's fine to pause when you're tired. Just don't quit."],
    ["राम्रो बानी बिस्तारै बन्छ, तर जीवनभर साथ दिन्छ।", "Good habits form slowly but stay with you for life."],
    ["सिक्न कहिल्यै ढिलो हुँदैन।", "It's never too late to learn."],
    ["मुस्कान पनि एउटा सानो दान हो।", "A smile is also a small act of giving."],
  ];
  let qi = 0;
  function showQuote() { $("#q-ne").textContent = QUOTES[qi][0]; $("#q-en").textContent = QUOTES[qi][1]; }
  function pickQuote(doy) { qi = doy % QUOTES.length; showQuote(); }
  $("#q-next").addEventListener("click", () => { qi = (qi + 1) % QUOTES.length; showQuote(); });

  /* ---------- weather (Open-Meteo, no API key) ---------- */
  const CITIES = [
    { n: "Kathmandu", lat: 27.7172, lon: 85.324 },
    { n: "Pokhara", lat: 28.2096, lon: 83.9856 },
    { n: "Biratnagar", lat: 26.4525, lon: 87.2718 },
    { n: "Birgunj", lat: 27.0104, lon: 84.877 },
    { n: "Janakpur", lat: 26.7288, lon: 85.926 },
    { n: "Butwal", lat: 27.7006, lon: 83.4483 },
    { n: "Nepalgunj", lat: 28.05, lon: 81.6167 },
    { n: "Dhangadhi", lat: 28.6833, lon: 80.6 },
  ];
  const WMO = (c) => {
    if (c === 0) return ["Clear sky", "☀️"];
    if (c === 1) return ["Mainly clear", "🌤️"];
    if (c === 2) return ["Partly cloudy", "⛅"];
    if (c === 3) return ["Overcast", "☁️"];
    if (c === 45 || c === 48) return ["Fog", "🌫️"];
    if (c >= 51 && c <= 57) return ["Drizzle", "🌦️"];
    if (c >= 61 && c <= 67) return ["Rain", "🌧️"];
    if (c >= 71 && c <= 77) return ["Snow", "🌨️"];
    if (c >= 80 && c <= 82) return ["Rain showers", "🌦️"];
    if (c === 85 || c === 86) return ["Snow showers", "🌨️"];
    if (c >= 95) return ["Thunderstorm", "⛈️"];
    return ["Unknown", "🌡️"];
  };

  const sel = $("#wx-city");
  for (const c of CITIES) { const o = document.createElement("option"); o.value = c.n; o.textContent = c.n; sel.appendChild(o); }
  const saved = store.get("city", "Kathmandu");
  sel.value = CITIES.some((c) => c.n === saved) ? saved : "Kathmandu";
  sel.addEventListener("change", () => { store.set("city", sel.value); loadWeather(); });

  let wxToken = 0;
  async function loadWeather() {
    const city = CITIES.find((c) => c.n === sel.value) || CITIES[0];
    const token = ++wxToken;
    $("#wx-desc").textContent = "Loading weather";
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + city.lat + "&longitude=" + city.lon +
        "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m" +
        "&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      if (token !== wxToken) return;
      const c = j.current, [desc, icon] = WMO(c.weather_code);
      $("#wx-icon").textContent = icon;
      $("#wx-temp").textContent = Math.round(c.temperature_2m);
      $("#wx-desc").textContent = desc + " in " + city.n;
      $("#wx-feels").textContent = Math.round(c.apparent_temperature) + "°C";
      $("#wx-hum").textContent = Math.round(c.relative_humidity_2m) + "%";
      $("#wx-wind").textContent = Math.round(c.wind_speed_10m) + " km/h";
      $("#wx-range").textContent = Math.round(j.daily.temperature_2m_min[0]) + "° / " + Math.round(j.daily.temperature_2m_max[0]) + "°C";
    } catch (e) {
      if (token !== wxToken) return;
      $("#wx-desc").textContent = "Weather is unavailable right now. Check your connection and try again.";
    } finally {
      clearTimeout(timer);
    }
  }

  syncFmt();
  tick();
  setInterval(tick, 1000);
  loadWeather();
  setInterval(loadWeather, 15 * 60 * 1000);
})();
