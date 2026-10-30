const API_URL = "http://localhost:5000/predict";
const $ = (id) => document.getElementById(id);

const CLASSES = [
  ["Insufficient_Weight", "Insufficient", "#4cc9f0"], ["Normal_Weight", "Normal", "#52d681"],
  ["Overweight_Level_I", "Overweight I", "#ffd166"], ["Overweight_Level_II", "Overweight II", "#ffb347"],
  ["Obesity_Type_I", "Obesity I", "#ff7f50"], ["Obesity_Type_II", "Obesity II", "#ef476f"],
  ["Obesity_Type_III", "Obesity III", "#b5179e"],
];
const colorOf = (key) => (CLASSES.find((c) => c[0] === key) || [0, 0, "#4cc9f0"])[2];

const S = { Gender: "Male", Age: 22, Height: 1.7, Weight: 70, family_history_with_overweight: "no",
  FAVC: "no", FCVC: 2, NCP: 3, CAEC: "Sometimes", SMOKE: "no", CH2O: 2, SCC: "no", FAF: 1, TUE: 1,
  CALC: "Sometimes", MTRANS: "Public_Transportation" };

const YN = [["yes", "Yes"], ["no", "No"]];
const FREQ = [["no", "Never"], ["Sometimes", "Sometimes"], ["Frequently", "Often"], ["Always", "Always"]];
const GROUPS = [
  ["About you", [
    ["seg", "Gender", "Gender", [["Male", "\u2642 Male"], ["Female", "\u2640 Female"]]],
    ["rng", "Age", "Age (years)", [14, 70, 1]],
    ["rng", "Height", "Height (m)", [1.4, 2.0, 0.01]],
    ["rng", "Weight", "Weight (kg)", [35, 180, 0.5]],
    ["seg", "family_history_with_overweight", "Family history of overweight", YN]]],
  ["Eating habits", [
    ["seg", "FAVC", "High-calorie food often", [["yes", "\uD83C\uDF54 Yes"], ["no", "\uD83E\uDD57 No"]]],
    ["rng", "FCVC", "Vegetables in meals (1 never \u2013 3 always)", [1, 3, 0.1]],
    ["rng", "NCP", "Main meals per day", [1, 4, 0.1]],
    ["seg", "CAEC", "Snacking between meals", FREQ],
    ["seg", "CALC", "Alcohol", FREQ],
    ["rng", "CH2O", "Water (1: <1 L, 2: 1\u20132 L, 3: >2 L)", [1, 3, 0.1]]]],
  ["Lifestyle", [
    ["seg", "SMOKE", "Smoker", YN],
    ["seg", "SCC", "Tracks calories", YN],
    ["rng", "FAF", "Physical activity (0 none \u2013 3 daily)", [0, 3, 0.1]],
    ["rng", "TUE", "Screen time (0: 0\u20132 h, 2: >5 h)", [0, 2, 0.1]],
    ["seg", "MTRANS", "Usual transport", [["Walking", "\uD83D\uDEB6 Walk"], ["Bike", "\uD83D\uDEB2 Bike"],
      ["Public_Transportation", "\uD83D\uDE8C Bus"], ["Motorbike", "\uD83C\uDFCD Moto"], ["Automobile", "\uD83D\uDE97 Car"]]]]],
];

const PRESETS = {
  Active: { Gender: "Female", Age: 24, Height: 1.68, Weight: 60, family_history_with_overweight: "no", FAVC: "no",
    FCVC: 3, NCP: 3, CAEC: "Sometimes", CALC: "no", CH2O: 3, FAF: 3, TUE: 0, MTRANS: "Bike" },
  Sedentary: { Gender: "Male", Age: 28, Height: 1.72, Weight: 86, family_history_with_overweight: "yes", FAVC: "yes",
    FCVC: 1.5, NCP: 3, CAEC: "Frequently", CALC: "Sometimes", CH2O: 1, FAF: 0, TUE: 2, MTRANS: "Automobile" },
  "High weight": { Gender: "Female", Age: 30, Height: 1.65, Weight: 120, family_history_with_overweight: "yes", FAVC: "yes",
    FCVC: 2, NCP: 3, CAEC: "Frequently", CALC: "Sometimes", CH2O: 1, FAF: 0, TUE: 2, MTRANS: "Automobile" },
};

const dec = (step) => (step >= 1 ? 0 : step < 0.05 ? 2 : 1);

function build() {
  $("form").innerHTML = GROUPS.map(([g, fields]) => `<h3>${g}</h3>` + fields.map(([t, k, label, o]) => {
    if (t === "seg") {
      return `<div class="f"><label>${label}</label><div class="seg">` +
        o.map(([v, n]) => `<button data-k="${k}" data-v="${v}" class="${S[k] === v ? "on" : ""}">${n}</button>`).join("") +
        `</div></div>`;
    }
    return `<div class="f"><label>${label}<b id="v_${k}">${(+S[k]).toFixed(dec(o[2]))}</b></label>` +
      `<input type="range" data-k="${k}" data-d="${dec(o[2])}" min="${o[0]}" max="${o[1]}" step="${o[2]}" value="${S[k]}"></div>`;
  }).join("")).join("");
  refresh();
}

$("form").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-k]");
  if (b) { S[b.dataset.k] = b.dataset.v; build(); }
});
$("form").addEventListener("input", (e) => {
  const r = e.target;
  if (r.type !== "range") return;
  S[r.dataset.k] = +r.value;
  $("v_" + r.dataset.k).textContent = (+r.value).toFixed(+r.dataset.d);
  refresh();
});

$("presets").innerHTML = Object.keys(PRESETS).map((n) => `<button data-p="${n}">${n}</button>`).join("");
$("presets").addEventListener("click", (e) => {
  const n = e.target.dataset.p;
  if (n) { Object.assign(S, PRESETS[n]); build(); }
});

/* ---------- BMI gauge ---------- */
const ZONES = [[10, 18.5, "#4cc9f0", "Underweight range"], [18.5, 25, "#52d681", "Healthy range"],
  [25, 27.5, "#ffd166", "Overweight range"], [27.5, 30, "#ffb347", "Overweight range"],
  [30, 35, "#ff7f50", "Obese range (Type I)"], [35, 40, "#ef476f", "Obese range (Type II)"],
  [40, 50, "#b5179e", "Obese range (Type III)"]];
const pt = (bmi, r) => {
  const a = Math.PI * (1 - (bmi - 10) / 40);
  return [120 + r * Math.cos(a), 125 - r * Math.sin(a)];
};
$("gauge").innerHTML =
  ZONES.map(([a, b, c]) => {
    const [x1, y1] = pt(a, 90), [x2, y2] = pt(b, 90);
    return `<path d="M${x1} ${y1} A90 90 0 0 1 ${x2} ${y2}" stroke="${c}" stroke-width="16" fill="none"/>`;
  }).join("") +
  [18.5, 25, 30, 40].map((v) => {
    const [x, y] = pt(v, 104);
    return `<text x="${x}" y="${y}" text-anchor="middle">${v}</text>`;
  }).join("") +
  `<line id="nd" x1="120" y1="125" x2="120" y2="55" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
  `<circle cx="120" cy="125" r="7" fill="#fff"/>`;

/* ---------- habit radar ---------- */
const AXES = ["Veggies", "Meals", "Water", "Activity", "Low screen"];
const radarPt = (i, v) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return [90 * v * Math.cos(a), 90 * v * Math.sin(a)];
};
function drawRadar() {
  const vals = [(S.FCVC - 1) / 2, (S.NCP - 1) / 3, (S.CH2O - 1) / 2, S.FAF / 3, 1 - S.TUE / 2];
  const ring = (v) => AXES.map((_, i) => radarPt(i, v).join(",")).join(" ");
  $("radar").innerHTML =
    [0.33, 0.66, 1].map((v) => `<polygon points="${ring(v)}" fill="none" stroke="#22304f"/>`).join("") +
    AXES.map((n, i) => {
      const [x, y] = radarPt(i, 1.2);
      return `<line x1="0" y1="0" x2="${radarPt(i, 1)[0]}" y2="${radarPt(i, 1)[1]}" stroke="#22304f"/>` +
        `<text x="${x}" y="${y + 3}" text-anchor="middle">${n}</text>`;
    }).join("") +
    `<polygon points="${vals.map((v, i) => radarPt(i, Math.max(v, 0.04)).join(",")).join(" ")}" fill="rgba(76,201,240,.35)" stroke="#4cc9f0" stroke-width="2"/>`;
}

function refresh() {
  const bmi = S.Weight / (S.Height * S.Height);
  const b = Math.min(50, Math.max(10, bmi));
  const [x, y] = pt(b, 70);
  $("nd").setAttribute("x2", x); $("nd").setAttribute("y2", y);
  $("bmiVal").textContent = bmi.toFixed(1);
  $("bmiZone").textContent = (ZONES.find(([a, z]) => b >= a && b < z) || ZONES[6])[3];
  drawRadar();
}

/* ---------- prediction ---------- */
$("go").addEventListener("click", async () => {
  $("err").hidden = true;
  $("go").disabled = true; $("go").textContent = "Predicting...";
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(S) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Prediction failed.");
    show(d);
  } catch (e) {
    $("err").textContent = e.message === "Failed to fetch" ? "Could not reach the backend. Is app.py running on port 5000?" : e.message;
    $("err").hidden = false; $("out").hidden = true;
  } finally {
    $("go").disabled = false; $("go").textContent = "Predict risk category";
  }
});

function show(d) {
  $("out").hidden = false;
  const c = colorOf(d.prediction);
  $("label").textContent = d.prediction_display; $("label").style.color = c;
  $("conf").textContent = `Model confidence: ${(d.confidence * 100).toFixed(1)}%`;
  $("scale").innerHTML = CLASSES.map(([k, , col]) => `<i style="background:${col}" class="${k === d.prediction ? "on" : ""}"></i>`).join("");
  $("bars").innerHTML = Object.entries(d.probabilities).map(([k, p]) =>
    `<div class="bar"><span>${k.replaceAll("_", " ")}</span><div><i style="width:${(p * 100).toFixed(1)}%;background:${colorOf(k)}"></i></div><span>${(p * 100).toFixed(1)}%</span></div>`).join("");
}

build();
