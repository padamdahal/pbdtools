(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);

  const DICT = {
    namaste: "नमस्ते",
    namaskar: "नमस्कार",
    nepal: "नेपाल",
    nepaal: "नेपाल",
    dhanyabad: "धन्यवाद",
    dhanyabaad: "धन्यवाद",
    dhanyavaad: "धन्यवाद",
    dhanyavad: "धन्यवाद",
    shubhakamana: "शुभकामना",
    subhakamana: "शुभकामना",
    shubha: "शुभ",
    subha: "शुभ",
    kamana: "कामना",
    kathmandu: "काठमाडौं",
    kathmaandou: "काठमाडौं",
    pokhara: "पोखरा",
    lalitpur: "ललितपुर",
    bhaktapur: "भक्तपुर",
    chitwan: "चितवन",
    biratnagar: "विराटनगर",
    tapain: "तपाईं",
    tapai: "तपाई",
    tapailai: "तपाईलाई",
    timi: "तिमी",
    ma: "म",
    mero: "मेरो",
    meri: "मेरी",
    mera: "मेरा",
    hamro: "हाम्रो",
    timro: "तिम्रो",
    usko: "उसको",
    unko: "उनको",
    ho: "हो",
    haina: "होइन",
    chaina: "छैन",
    chha: "छ",
    cha: "छ",
    chhan: "छन्",
    chan: "छन्",
    thiyo: "थियो",
    thiyen: "थिएन",
    bhayo: "भयो",
    bhayena: "भएन",
    garnu: "गर्नु",
    garchhu: "गर्छु",
    garchha: "गर्छ",
    gardaichhu: "गर्दैछु",
    aaja: "आज",
    hijo: "हिजो",
    bholi: "भोलि",
    ahile: "अहिले",
    pahila: "पहिला",
    pachi: "पछि",
    kati: "कति",
    kasto: "कस्तो",
    kasto: "कस्तो",
    kaha: "कहाँ",
    kahaan: "कहाँ",
    kahile: "कहिले",
    kin: "किन",
    ke: "के",
    ko: "को",
    lai: "लाई",
    bata: "बाट",
    dekhi: "देखि",
    samma: "सम्म",
    ra: "र",
    ani: "अनि",
    tara: "तर",
    ki: "कि",
    yadi: "यदि",
    yedi: "यदि",
    thik: "ठीक",
    ramro: "राम्रो",
    naramro: "नराम्रो",
    thulo: "ठूलो",
    sano: "सानो",
    naya: "नयाँ",
    purano: "पुरानो",
    dherai: "धेरै",
    thorai: "थोरै",
    sabai: "सबै",
    kehi: "केही",
    kei: "केही",
    pani: "पानी",
    paani: "पानी",
    khana: "खाना",
    ghar: "घर",
    school: "स्कूल",
    iskul: "स्कूल",
    kitab: "किताब",
    mitra: "मित्र",
    sathi: "साथी",
    pariwar: "परिवार",
    parivaar: "परिवार",
    aama: "आमा",
    ama: "आमा",
    buwa: "बुवा",
    buba: "बुबा",
    dai: "दाइ",
    didi: "दिदी",
    bhai: "भाइ",
    bahini: "बहिनी",
    chhora: "छोरा",
    chhori: "छोरी",
    manchhe: "मान्छे",
    manche: "मान्छे",
    desh: "देश",
    bhasha: "भाषा",
    bhaasha: "भाषा",
    sarkar: "सरकार",
    karyalaya: "कार्यालय",
    kaaryaalaya: "कार्यालय",
    prashasan: "प्रशासन",
    shiksha: "शिक्षा",
    swasthya: "स्वास्थ्य",
    byapar: "व्यापार",
    byaapaar: "व्यापार",
    yatra: "यात्रा",
    prem: "प्रेम",
    maya: "माया",
    khusi: "खुसी",
    dukha: "दुःख",
    sukha: "सुख",
    shanti: "शान्ति",
    saanti: "शान्ति",
    om: "ॐ",
    shree: "श्री",
    sree: "श्री",
    ji: "जी",
    hajur: "हजुर",
    hola: "होला",
    hunuhunchha: "हुनुहुन्छ",
    hunuhuncha: "हुनुहुन्छ",
    garnuhos: "गर्नुहोस्",
    basnuhos: "बस्नुहोस्",
    aainuhos: "आउनुहोस्",
    jaanuhos: "जानुहोस्",
    kripay: "कृपया",
    kripaya: "कृपया",
    please: "कृपया",
    sorry: "माफ गर्नुहोस्",
    maaf: "माफ",
    thankyou: "धन्यवाद",
    hello: "नमस्ते",
    bye: "बिदा",
    goodmorning: "शुभ प्रभात",
    goodnight: "शुभ रात्रि",
    congrats: "बधाई",
    badhai: "बधाई",
    janmadin: "जन्मदिन",
    birthday: "जन्मदिन",
    gyan: "ज्ञान",
    gyaan: "ज्ञान",
    kshama: "क्षमा",
    kshamaa: "क्षमा",
    shrimati: "श्रीमती",
    shreeman: "श्रीमान",
    pandit: "पण्डित",
    mandir: "मन्दिर",
    pustak: "पुस्तक",
    vidyalaya: "विद्यालय",
    bidyalaya: "विद्यालय",
    hospital: "अस्पताल",
    aspatal: "अस्पताल",
    doctor: "डाक्टर",
    daktar: "डाक्टर",
    police: "प्रहरी",
    prahari: "प्रहरी",
    krishi: "कृषि",
    udyog: "उद्योग",
    computer: "कम्प्युटर",
    kampyutar: "कम्प्युटर",
    internet: "इन्टरनेट",
    mobile: "मोबाइल",
    phone: "फोन",
    message: "सन्देश",
    sandesh: "सन्देश",
    ktm: "काठमाडौं",
    lagi: "लागि",
    bare: "बारे",
    baare: "बारे",
    sambandha: "सम्बन्ध",
    prati: "प्रति",
    dwara: "द्वारा",
    anusar: "अनुसार",
    anusaar: "अनुसार",
    adhaar: "आधार",
    aadhar: "आधार",
    prashna: "प्रश्न",
    uttar: "उत्तर",
    samasya: "समस्या",
    samadhan: "समाधान",
    pradesh: "प्रदेश",
    jilla: "जिल्ला",
    jillaa: "जिल्ला",
    nagarpalika: "नगरपालिका",
    gaunpalika: "गाउँपालिका",
    mahanagar: "महानगर"
  };

  const RULES = [
    ["ksh", "क्ष", true], ["kSh", "क्ष", true], ["x", "क्ष", true],
    ["gy", "ज्ञ", true], ["gny", "ज्ञ", true], ["jn", "ज्ञ", true], ["jyn", "ज्ञ", true],
    ["shr", "श्र", true], ["tr", "त्र", true],
    ["dhr", "ध्र", true], ["kr", "क्र", true], ["gr", "ग्र", true], ["pr", "प्र", true],
    ["br", "ब्र", true], ["mr", "म्र", true], ["dr", "द्र", true], ["dv", "द्व", true],
    ["tt", "त्त", true], ["dd", "द्द", true], ["nn", "न्न", true], ["mm", "म्म", true],
    ["ll", "ल्ल", true], ["ss", "स्स", true], ["kk", "क्क", true], ["pp", "प्प", true],
    ["chh", "छ", true], ["cch", "च्छ", true],
    ["kh", "ख", true], ["gh", "घ", true], ["ch", "च", true], ["jh", "झ", true],
    ["th", "थ", true], ["dh", "ध", true], ["ph", "फ", true], ["bh", "भ", true],
    ["sh", "श", true], ["Sh", "ष", true], ["shh", "ष", true],
    ["ng", "ङ", true], ["ny", "ञ", true], ["yn", "ञ", true],
    ["Th", "ठ", true], ["Dh", "ढ", true], ["T", "ट", true], ["D", "ड", true], ["N", "ण", true],
    ["k", "क", true], ["g", "ग", true], ["c", "च", true], ["j", "ज", true],
    ["t", "त", true], ["d", "द", true], ["n", "न", true], ["p", "प", true],
    ["f", "फ", true], ["b", "ब", true], ["m", "म", true], ["y", "य", true],
    ["r", "र", true], ["l", "ल", true], ["v", "व", true], ["w", "व", true],
    ["s", "स", true], ["h", "ह", true], ["z", "ष", true], ["q", "क़", true]
  ];

  const VOWELS_IND = [
    ["aa", "आ"], ["ii", "ई"], ["ee", "ई"], ["uu", "ऊ"], ["oo", "ऊ"],
    ["ai", "ऐ"], ["au", "औ"], ["Ri", "ऋ"], ["ri", "ऋ"],
    ["aM", "अं"], ["am", "अं"], ["aN", "अँ"], ["a~", "अँ"], ["ah", "अः"], ["a:", "अः"],
    ["a", "अ"], ["i", "इ"], ["u", "उ"], ["e", "ए"], ["o", "ओ"],
    ["A", "आ"], ["I", "ई"], ["U", "ऊ"], ["E", "ऐ"], ["O", "औ"]
  ];

  const MATRAS = [
    ["aa", "ा"], ["ii", "ी"], ["ee", "ी"], ["uu", "ू"], ["oo", "ू"],
    ["ai", "ै"], ["au", "ौ"], ["Ri", "ृ"], ["ri", "ृ"],
    ["aM", "ं"], ["am", "ं"], ["aN", "ँ"], ["a~", "ँ"], ["ah", "ः"], ["a:", "ः"],
    ["i", "ि"], ["u", "ु"], ["e", "े"], ["o", "ो"],
    ["A", "ा"], ["I", "ी"], ["U", "ू"], ["E", "ै"], ["O", "ौ"],
    ["a", ""]
  ];

  const HALANT = "्";
  const DIGIT_MAP = {
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
    "5": "५", "6": "६", "7": "७", "8": "८", "9": "९"
  };

  function matchLongest(str, i, table) {
    for (let j = 0; j < table.length; j++) {
      const rom = table[j][0];
      if (str.startsWith(rom, i)) return table[j];
    }
    return null;
  }

  function matchMatra(str, i) {
    const mat = matchLongest(str, i, MATRAS);
    if (!mat) return null;
    if (mat[0] === "am" || mat[0] === "aM" || mat[0] === "ah" || mat[0] === "a:" || mat[0] === "aN" || mat[0] === "a~") {
      const next = str[i + mat[0].length];
      if (next && /[a-zA-Z]/.test(next)) {
        if (str[i] === "a" || str[i] === "A") return ["a", ""];
        return null;
      }
    }
    return mat;
  }

  function convertWord(romanWord) {
    if (!romanWord) return "";
    const lower = romanWord.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(DICT, lower)) return DICT[lower];

    let out = "";
    let i = 0;
    const s = romanWord;
    let pendingConsonant = false;

    while (i < s.length) {
      const ch = s[i];

      if (DIGIT_MAP[ch]) {
        pendingConsonant = false;
        out += DIGIT_MAP[ch];
        i += 1;
        continue;
      }
      if (!/[a-zA-Z~:]/.test(ch)) {
        pendingConsonant = false;
        out += ch;
        i += 1;
        continue;
      }

      const cons = matchLongest(s, i, RULES);
      if (cons) {
        if (pendingConsonant) out += HALANT;
        out += cons[1];
        pendingConsonant = true;
        i += cons[0].length;
        const mat = matchMatra(s, i);
        if (mat) {
          out += mat[1];
          pendingConsonant = false;
          i += mat[0].length;
        }
        continue;
      }

      const vow = matchLongest(s, i, VOWELS_IND);
      if (vow) {
        if (pendingConsonant) {
          const mat = matchMatra(s, i);
          if (mat) {
            out += mat[1];
            pendingConsonant = false;
            i += mat[0].length;
            continue;
          }
          pendingConsonant = false;
        }
        out += vow[1];
        pendingConsonant = false;
        i += vow[0].length;
        continue;
      }

      out += ch;
      pendingConsonant = false;
      i += 1;
    }
    return out;
  }

  function convertText(roman, useNepaliDigits) {
    if (!roman) return "";
    const parts = roman.split(/(\s+)/);
    const out = [];
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      if (/^\s+$/.test(part)) {
        out.push(part);
        continue;
      }
      out.push(convertWord(part));
    }
    let result = out.join("");
    if (useNepaliDigits) {
      result = result.replace(/[0-9]/g, (d) => DIGIT_MAP[d] || d);
    }
    return result;
  }

  const input = byId("roman");
  const output = byId("nepali");
  const status = byId("status");
  const countEl = byId("count");
  const digitsToggle = byId("nepali-digits");
  const STORAGE_KEY = "nepali-typing-draft-v1";

  function update() {
    const roman = input.value;
    const nep = convertText(roman, digitsToggle && digitsToggle.checked);
    output.value = nep;
    const chars = nep.replace(/\s/g, "").length;
    const words = nep.trim() ? nep.trim().split(/\s+/).length : 0;
    countEl.textContent = words + " word" + (words === 1 ? "" : "s") + " · " + chars + " character" + (chars === 1 ? "" : "s");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ roman: roman, digits: !!(digitsToggle && digitsToggle.checked) }));
    } catch (e) {}
  }

  function setStatus(msg) {
    status.textContent = msg || "";
    if (msg) {
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(() => { status.textContent = ""; }, 2200);
    }
  }

  input.addEventListener("input", update);
  if (digitsToggle) digitsToggle.addEventListener("change", update);

  byId("btn-copy").addEventListener("click", async () => {
    const text = output.value;
    if (!text) { setStatus("Nothing to copy."); return; }
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied Nepali text.");
    } catch (e) {
      output.select();
      document.execCommand("copy");
      setStatus("Copied Nepali text.");
    }
  });

  byId("btn-download").addEventListener("click", () => {
    const text = output.value;
    if (!text) { setStatus("Nothing to download."); return; }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nepali-text.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus("Downloaded .txt file.");
  });

  byId("btn-clear").addEventListener("click", () => {
    input.value = "";
    output.value = "";
    update();
    input.focus();
    setStatus("Cleared.");
  });

  byId("btn-swap").addEventListener("click", () => { input.focus(); });

  document.querySelectorAll("[data-phrase]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const phrase = btn.getAttribute("data-phrase") || "";
      const start = input.selectionStart || input.value.length;
      const end = input.selectionEnd || input.value.length;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      const needsSpace = before.length && !/\s$/.test(before);
      const insert = (needsSpace ? " " : "") + phrase;
      input.value = before + insert + after;
      const pos = (before + insert).length;
      input.setSelectionRange(pos, pos);
      input.focus();
      update();
    });
  });

  document.querySelectorAll("[data-example]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ex = btn.getAttribute("data-example") || "";
      input.value = ex;
      update();
      input.focus();
    });
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data.roman === "string" && data.roman) {
        input.value = data.roman;
        if (digitsToggle && typeof data.digits === "boolean") digitsToggle.checked = data.digits;
      }
    }
  } catch (e) {}

  update();
  input.focus();
})();
