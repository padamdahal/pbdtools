(() => {
    "use strict";

    const BS_START = 2000;
    // Packed month lengths: each digit is (days - 28) for Baishakh…Chaitra, 91 years
    const _BS_PACK = "243432221213334333212122334432212122343432221123243432221213334333212122334432212122343432221123333433122113334333212122334432212122343432221123333433122122334333212122334432212122343432221123333433122122334333212122343432212122343432221213333433212122334333212122343432221122343432221213333433212122334333212122343432221123243432221213334333212122334342212122343432221123243432221213334333212122334432212122343432221123243433122113334333212122334432212122343432221123333433122122334333212122334432212122343432221123333433122122334333212122343432212122343432221123333433212122334333212122343432221122343432221213333433212122334333212122343432221122343432221213334333212122334342212122343432221123243432221213334333212122334432212122343432221123243433121213334333212122334432212122343432221123333433122113334333212122334432212122343432221123333433122122334333212122343432212122343432221123333433212122334333212122343432221122343432221213333433212122334333212122343432221122343432221213334333212122334333212122343432221123243432221213334333212122334333221222234423221222243432221222243432221222";
    const BS_MONTHS = Array.from({ length: _BS_PACK.length / 12 }, (_, y) =>
      Array.from({ length: 12 }, (_, m) => 28 + (+_BS_PACK[y * 12 + m]))
    );

    const BS_END = BS_START + BS_MONTHS.length - 1; // 2090

    // AD epoch corresponding to BS 2000-01-01
    const EPOCH_AD = new Date(Date.UTC(1943, 3, 14)); // 1943-04-14

    const BS_MONTH_NE = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कार्तिक","मंसिर","पुस","माघ","फागुन","चैत"];
    const BS_MONTH_EN = ["Baishakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
    const AD_MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const WD_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const WD_NE = ["आइतबार","सोमबार","मंगलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];

    const $ = (id) => document.getElementById(id);
    const hint = $("hint");

    function daysInBsMonth(y, m /* 1-12 */) {
      const i = y - BS_START;
      if (i < 0 || i >= BS_MONTHS.length) return 0;
      return BS_MONTHS[i][m - 1];
    }

    function isValidBs(y, m, d) {
      if (y < BS_START || y > BS_END || m < 1 || m > 12 || d < 1) return false;
      return d <= daysInBsMonth(y, m);
    }

    function bsToAbsolute(y, m, d) {
      let days = 0;
      for (let yr = BS_START; yr < y; yr++) {
        const row = BS_MONTHS[yr - BS_START];
        for (let i = 0; i < 12; i++) days += row[i];
      }
      const row = BS_MONTHS[y - BS_START];
      for (let i = 0; i < m - 1; i++) days += row[i];
      days += d - 1;
      return days;
    }

    function absoluteToBs(abs) {
      let remaining = abs;
      for (let yr = BS_START; yr <= BS_END; yr++) {
        const row = BS_MONTHS[yr - BS_START];
        const yearDays = row.reduce((a, b) => a + b, 0);
        if (remaining < yearDays) {
          for (let m = 0; m < 12; m++) {
            if (remaining < row[m]) return { y: yr, m: m + 1, d: remaining + 1 };
            remaining -= row[m];
          }
        }
        remaining -= yearDays;
      }
      return null;
    }

    function bsToAd(y, m, d) {
      if (!isValidBs(y, m, d)) return null;
      const abs = bsToAbsolute(y, m, d);
      const ad = new Date(EPOCH_AD.getTime() + abs * 86400000);
      return { y: ad.getUTCFullYear(), m: ad.getUTCMonth() + 1, d: ad.getUTCDate(), wd: ad.getUTCDay() };
    }

    function adToBs(y, m, d) {
      const ad = new Date(Date.UTC(y, m - 1, d));
      if (ad.getUTCFullYear() !== y || ad.getUTCMonth() !== m - 1 || ad.getUTCDate() !== d) return null;
      const abs = Math.round((ad.getTime() - EPOCH_AD.getTime()) / 86400000);
      if (abs < 0) return null;
      const bs = absoluteToBs(abs);
      if (!bs) return null;
      return { ...bs, wd: ad.getUTCDay() };
    }

    function fillSelect(el, items, selected) {
      el.innerHTML = "";
      for (const it of items) {
        const o = document.createElement("option");
        o.value = it.value;
        o.textContent = it.label;
        if (String(it.value) === String(selected)) o.selected = true;
        el.appendChild(o);
      }
    }

    function daysInAdMonth(y, m) {
      return new Date(Date.UTC(y, m, 0)).getUTCDate();
    }

    fillSelect($("bs-m"), BS_MONTH_EN.map((n, i) => ({
      value: i + 1,
      label: (i + 1) + " – " + n + " (" + BS_MONTH_NE[i] + ")",
    })), 1);
    fillSelect($("ad-m"), AD_MONTH_EN.map((n, i) => ({
      value: i + 1,
      label: (i + 1) + " – " + n,
    })), 1);

    function refreshBsDays(keep) {
      const y = +$("bs-y").value, m = +$("bs-m").value;
      const max = daysInBsMonth(y, m) || 32;
      const cur = keep != null ? keep : +$("bs-d").value || 1;
      fillSelect($("bs-d"), Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) })), Math.min(cur, max));
    }
    function refreshAdDays(keep) {
      const y = +$("ad-y").value || 2000, m = +$("ad-m").value || 1;
      const max = daysInAdMonth(y, m);
      const cur = keep != null ? keep : +$("ad-d").value || 1;
      fillSelect($("ad-d"), Array.from({ length: max }, (_, i) => ({ value: i + 1, label: String(i + 1) })), Math.min(cur, max));
    }

    let lock = false;

    function fromBs() {
      if (lock) return;
      hint.textContent = "";
      hint.classList.remove("error");
      const y = +$("bs-y").value, m = +$("bs-m").value, d = +$("bs-d").value;
      if (!y) {
        $("bs-out-main").textContent = "—";
        $("bs-out-sub").textContent = "";
        return;
      }
      if (!isValidBs(y, m, d)) {
        hint.textContent = "That BS date is out of range or invalid for this calendar.";
        hint.classList.add("error");
        $("bs-out-main").textContent = "Invalid date";
        $("bs-out-sub").textContent = "";
        return;
      }
      const ad = bsToAd(y, m, d);
      if (!ad) {
        hint.textContent = "Could not convert this BS date.";
        hint.classList.add("error");
        return;
      }
      $("bs-out-main").textContent = BS_MONTH_NE[m - 1] + " " + d + ", " + y;
      $("bs-out-sub").textContent = BS_MONTH_EN[m - 1] + " " + d + ", " + y + " BS · " + WD_NE[ad.wd];

      lock = true;
      $("ad-y").value = ad.y;
      $("ad-m").value = ad.m;
      refreshAdDays(ad.d);
      $("ad-d").value = ad.d;
      $("ad-out-main").textContent = AD_MONTH_EN[ad.m - 1] + " " + ad.d + ", " + ad.y;
      $("ad-out-sub").textContent = WD_EN[ad.wd] + " · AD / CE";
      lock = false;
    }

    function fromAd() {
      if (lock) return;
      hint.textContent = "";
      hint.classList.remove("error");
      const y = +$("ad-y").value, m = +$("ad-m").value, d = +$("ad-d").value;
      if (!y) {
        $("ad-out-main").textContent = "—";
        $("ad-out-sub").textContent = "";
        return;
      }
      const bs = adToBs(y, m, d);
      if (!bs) {
        hint.textContent = "That AD date is out of range (supported AD 1943–2034).";
        hint.classList.add("error");
        $("ad-out-main").textContent = "Out of range";
        $("ad-out-sub").textContent = "";
        return;
      }
      $("ad-out-main").textContent = AD_MONTH_EN[m - 1] + " " + d + ", " + y;
      $("ad-out-sub").textContent = WD_EN[bs.wd] + " · AD / CE";

      lock = true;
      $("bs-y").value = bs.y;
      $("bs-m").value = bs.m;
      refreshBsDays(bs.d);
      $("bs-d").value = bs.d;
      $("bs-out-main").textContent = BS_MONTH_NE[bs.m - 1] + " " + bs.d + ", " + bs.y;
      $("bs-out-sub").textContent = BS_MONTH_EN[bs.m - 1] + " " + bs.d + ", " + bs.y + " BS · " + WD_NE[bs.wd];
      lock = false;
    }

    ["bs-y", "bs-m", "bs-d"].forEach((id) => {
      $(id).addEventListener("input", () => {
        if (id !== "bs-d") refreshBsDays();
        fromBs();
      });
      $(id).addEventListener("change", () => {
        if (id !== "bs-d") refreshBsDays();
        fromBs();
      });
    });
    ["ad-y", "ad-m", "ad-d"].forEach((id) => {
      $(id).addEventListener("input", () => {
        if (id !== "ad-d") refreshAdDays();
        fromAd();
      });
      $(id).addEventListener("change", () => {
        if (id !== "ad-d") refreshAdDays();
        fromAd();
      });
    });

    const now = new Date();
    const todayAd = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    const todayBs = adToBs(todayAd.y, todayAd.m, todayAd.d);

    if (todayBs) {
      $("today-bs").textContent =
        BS_MONTH_NE[todayBs.m - 1] + " " + todayBs.d + ", " + todayBs.y + " (" + BS_MONTH_EN[todayBs.m - 1] + " " + todayBs.d + ", " + todayBs.y + " BS)";
      $("today-ad").textContent =
        AD_MONTH_EN[todayAd.m - 1] + " " + todayAd.d + ", " + todayAd.y + " AD";

      lock = true;
      $("bs-y").value = todayBs.y;
      $("bs-m").value = todayBs.m;
      refreshBsDays(todayBs.d);
      $("bs-d").value = todayBs.d;
      $("ad-y").value = todayAd.y;
      $("ad-m").value = todayAd.m;
      refreshAdDays(todayAd.d);
      $("ad-d").value = todayAd.d;
      lock = false;
      fromBs();
    } else {
      refreshBsDays(1);
      refreshAdDays(1);
    }

    $("use-today-bs").addEventListener("click", () => {
      if (!todayBs) return;
      lock = true;
      $("bs-y").value = todayBs.y;
      $("bs-m").value = todayBs.m;
      refreshBsDays(todayBs.d);
      $("bs-d").value = todayBs.d;
      lock = false;
      fromBs();
    });
    $("use-today-ad").addEventListener("click", () => {
      lock = true;
      $("ad-y").value = todayAd.y;
      $("ad-m").value = todayAd.m;
      refreshAdDays(todayAd.d);
      $("ad-d").value = todayAd.d;
      lock = false;
      fromAd();
    });
  })();
