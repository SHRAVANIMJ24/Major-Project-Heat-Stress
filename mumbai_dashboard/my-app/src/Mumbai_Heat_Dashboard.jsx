import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, CartesianGrid, Cell,
} from "recharts";

// ═══ IMD CONSTANTS ═══════════════════════════════════════════════════════
const HI_CATS = [
  { label:"Low Risk",  range:"HI < 33°C",  color:"#16A34A", health:"Fatigue possible with prolonged exposure", icon:"🟢" },
  { label:"Moderate",  range:"33–39°C",     color:"#D97706", health:"Heat cramps and exhaustion possible", icon:"🟡" },
  { label:"High Risk", range:"39–46°C",     color:"#DC2626", health:"Heat cramps/exhaustion likely, heatstroke possible", icon:"🔴" },
  { label:"Very High", range:"HI ≥ 46°C",   color:"#7C3AED", health:"Heatstroke highly likely — immediate danger", icon:"🟣" },
];

const STATIONS = {
  "43003": { name:"Santacruz", type:"Inland / Suburban", records:"155,390", f1:"0.9470", acc:"99.34%", vhSens:"94.74% (18/19)", kappa:"0.9877" },
  "43057": { name:"Colaba",    type:"Coastal",           records:"59,909",  f1:"0.9561", acc:"99.35%", vhSens:"98.77% (80/81)", kappa:"0.9893" },
};

const MODEL_HI = {
  "43003": [
    { model:"★ SAINT-XGB-Stack", f1:0.947, acc:0.993 },
    { model:"XGBoost",           f1:0.925, acc:0.996 },
    { model:"SVC",               f1:0.863, acc:0.970 },
    { model:"KNN",               f1:0.747, acc:0.938 },
    { model:"SAINT",             f1:0.673, acc:0.874 },
    { model:"NaiveBayes",        f1:0.617, acc:0.772 },
  ],
  "43057": [
    { model:"★ SAINT-XGB-Stack", f1:0.956, acc:0.994 },
    { model:"XGBoost",           f1:0.953, acc:0.993 },
    { model:"SAINT",             f1:0.944, acc:0.971 },
    { model:"SVC",               f1:0.928, acc:0.981 },
    { model:"KNN",               f1:0.848, acc:0.932 },
    { model:"NaiveBayes",        f1:0.737, acc:0.773 },
  ],
};

const CORR_DATA = [
  { poll:"NO2", r:-0.320, sig:"***" }, { poll:"PM2.5", r:-0.281, sig:"***" },
  { poll:"PM10", r:-0.272, sig:"***" }, { poll:"AQI", r:-0.246, sig:"***" },
  { poll:"CO", r:-0.188, sig:"***" }, { poll:"NH3", r:0.076, sig:"***" },
  { poll:"Ozone", r:0.059, sig:"***" }, { poll:"SO2", r:-0.024, sig:"n.s." },
];

const SEASONAL_CORR = [
  { season:"Winter", PM25:-0.17, NO2:-0.33, CO:-0.13, Ozone:0.18 },
  { season:"Pre-monsoon", PM25:-0.10, NO2:-0.14, CO:-0.06, Ozone:-0.07 },
  { season:"Monsoon", PM25:0.38, NO2:-0.29, CO:-0.06, Ozone:-0.20 },
  { season:"Post-monsoon", PM25:-0.19, NO2:-0.17, CO:-0.10, Ozone:0.11 },
];

const HR_OPTIONS = [
  { code:0,  label:"05:30 IST (Early Morning)" },
  { code:12, label:"08:30 IST (Morning)" },
  { code:24, label:"11:30 IST (Late Morning)" },
  { code:36, label:"14:30 IST (Afternoon)" },
  { code:48, label:"17:30 IST (Evening)" },
  { code:60, label:"20:30 IST (Night)" },
  { code:72, label:"23:30 IST (Late Night)" },
  { code:84, label:"02:30 IST +1 (Post Midnight)" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const FEATURE_IMPORTANCE = {
  DBT: 0.966, WBT: 0.531, VPD: 0.380, VP: 0.249, DPT: 0.236,
  Hour_cos: 0.234, Temp_RH: 0.233, FFF: 0.186, WBD: 0.169, Month_cos: 0.154,
};

const ERA5_HS_THRESHOLD = 30;

// ── 30-day forecast from LightGBM-Tuned (Step 13.5 output) ────────────────
const ERA5_FORECAST = [
  {date:"2026-03-15",wbgt:30.03,hs:"YES"},{date:"2026-03-16",wbgt:29.98,hs:"no"},
  {date:"2026-03-17",wbgt:29.92,hs:"no"},{date:"2026-03-18",wbgt:30.27,hs:"YES"},
  {date:"2026-03-19",wbgt:30.13,hs:"YES"},{date:"2026-03-20",wbgt:30.02,hs:"YES"},
  {date:"2026-03-21",wbgt:29.95,hs:"no"},{date:"2026-03-22",wbgt:30.31,hs:"YES"},
  {date:"2026-03-23",wbgt:30.49,hs:"YES"},{date:"2026-03-24",wbgt:31.13,hs:"YES"},
  {date:"2026-03-25",wbgt:31.37,hs:"YES"},{date:"2026-03-26",wbgt:31.11,hs:"YES"},
  {date:"2026-03-27",wbgt:31.24,hs:"YES"},{date:"2026-03-28",wbgt:30.97,hs:"YES"},
  {date:"2026-03-29",wbgt:31.01,hs:"YES"},{date:"2026-03-30",wbgt:30.90,hs:"YES"},
  {date:"2026-03-31",wbgt:30.83,hs:"YES"},{date:"2026-04-01",wbgt:30.49,hs:"YES"},
  {date:"2026-04-02",wbgt:30.78,hs:"YES"},{date:"2026-04-03",wbgt:30.49,hs:"YES"},
  {date:"2026-04-04",wbgt:30.67,hs:"YES"},{date:"2026-04-05",wbgt:30.71,hs:"YES"},
  {date:"2026-04-06",wbgt:31.18,hs:"YES"},{date:"2026-04-07",wbgt:31.16,hs:"YES"},
  {date:"2026-04-08",wbgt:31.22,hs:"YES"},{date:"2026-04-09",wbgt:31.32,hs:"YES"},
  {date:"2026-04-10",wbgt:31.25,hs:"YES"},{date:"2026-04-11",wbgt:31.46,hs:"YES"},
  {date:"2026-04-12",wbgt:31.30,hs:"YES"},{date:"2026-04-13",wbgt:31.87,hs:"YES"},
];

const ERA5_HS_COUNT = ERA5_FORECAST.filter(d => d.hs === "YES").length;
const FORECAST_MIN_DATE = ERA5_FORECAST[0].date;
const FORECAST_MAX_DATE = ERA5_FORECAST[ERA5_FORECAST.length - 1].date;

// ─── WBGT ISO categories (for display in lookup card) ─────────────────────
function wbgtCategoryInfo(wbgt) {
  if (wbgt >= 32) return { label:"Extreme",  color:"#7C3AED", icon:"🟣", health:"Extreme heat stress. Suspend outdoor activities." };
  if (wbgt >= 28) return { label:"Danger",   color:"#DC2626", icon:"🔴", health:"High heat stress. Restrict heavy outdoor work." };
  if (wbgt >= 25) return { label:"Caution",  color:"#D97706", icon:"🟡", health:"Moderate heat stress. Limit strenuous work." };
  return               { label:"Normal",   color:"#16A34A", icon:"🟢", health:"No heat stress. Comfortable conditions." };
}

// ═══ IMD HELPERS ═════════════════════════════════════════════════════════
function computeDerivedFeatures(raw) {
  const { DBT, RH, WBT, DPT, VP, FFF, month, hourCode } = raw;
  const svp = 6.112 * Math.exp((17.67 * DBT) / (DBT + 243.5));
  return {
    DBT, WBT, DPT, VP, FFF,
    VPD:       Math.max(svp - VP, 0),
    Temp_RH:   DBT * RH / 100,
    WBD:       DBT - WBT,
    Month_cos: Math.cos(2 * Math.PI * month / 12),
    Hour_cos:  Math.cos(2 * Math.PI * hourCode / 84),
  };
}

function computeHI(dbt, rh) {
  const tf = dbt * 9/5 + 32;
  let hi = -42.379 + 2.04901523*tf + 10.14333127*rh - 0.22475541*tf*rh
    - 6.83783e-3*tf*tf - 5.481717e-2*rh*rh + 1.22874e-3*tf*tf*rh
    + 8.5282e-4*tf*rh*rh - 1.99e-6*tf*tf*rh*rh;
  if (rh > 85 && tf >= 80 && tf <= 87) hi += ((rh-85)/10)*((87-tf)/5);
  if (rh < 13 && tf >= 80 && tf <= 112) hi -= ((13-rh)/4)*Math.sqrt((17-Math.abs(tf-95))/17);
  const avg = 0.5*(0.5*(tf+61+(tf-68)*1.2+rh*0.094)+tf);
  if (avg < 80) hi = 0.5*(tf+61+(tf-68)*1.2+rh*0.094);
  return (hi-32)*5/9;
}

// ═══ SHARED UI ═══════════════════════════════════════════════════════════
function Card({ children, className="" }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>{children}</div>;
}

function InputField({ label, unit, value, onChange, min, max, step=1, hint }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      <input type="number" value={value} onChange={e => onChange(+e.target.value)}
        min={min} max={max} step={step}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all" />
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

// ═══ ERA5: DATE LOOKUP COMPONENT ══════════════════════════════════════════
function DateLookup() {
  const [inputDate, setInputDate] = useState("");
  const [searched, setSearched]   = useState(false);

  // Derived: find the matching day
  const found = useMemo(() => {
    if (!inputDate) return null;
    return ERA5_FORECAST.find(d => d.date === inputDate) || null;
  }, [inputDate]);

  const outOfRange = inputDate && !found && inputDate >= FORECAST_MIN_DATE && inputDate <= FORECAST_MAX_DATE
    ? false   // in range but not found (shouldn't happen with exact data)
    : inputDate && !found;

  function handleLookup() { setSearched(true); }
  function handleClear() { setInputDate(""); setSearched(false); }

  const catInfo = found ? wbgtCategoryInfo(found.wbgt) : null;
  const isHS    = found?.hs === "YES";

  // Day-in-sequence label
  const dayIndex = found ? ERA5_FORECAST.findIndex(d => d.date === found.date) + 1 : null;

  return (
    <Card className="p-6">
      <h3 className="text-base font-bold text-slate-800 mb-1">📅 Date Lookup</h3>
      <p className="text-xs text-slate-400 mb-4">
        Select any date from the 30-day forecast period ({FORECAST_MIN_DATE} → {FORECAST_MAX_DATE}) to see predicted WBGT and heat stress status.
      </p>

      {/* Input row */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-600 block mb-1">Select Date</label>
          <input
            type="date"
            value={inputDate}
            min={FORECAST_MIN_DATE}
            max={FORECAST_MAX_DATE}
            onChange={e => { setInputDate(e.target.value); setSearched(false); }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
          />
        </div>
        {/* Quick-select dropdown */}
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-600 block mb-1">Or pick from list</label>
          <select
            value={inputDate}
            onChange={e => { setInputDate(e.target.value); setSearched(true); }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">— choose a date —</option>
            {ERA5_FORECAST.map((d, i) => (
              <option key={d.date} value={d.date}>
                Day {i+1}: {d.date} {d.hs === "YES" ? "🔴 Heat Stress" : "🟢 Normal"}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLookup}
          disabled={!inputDate}
          className="px-5 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-40 transition-all">
          Look up
        </button>
        {inputDate && (
          <button onClick={handleClear} className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50">
            Clear
          </button>
        )}
      </div>

      {/* Result */}
      {(searched || inputDate) && (
        <div className="mt-4">
          {found ? (
            <div className={`rounded-2xl p-5 border-2 transition-all ${isHS ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                {/* Left: date + day number */}
                <div>
                  <div className="text-xs text-slate-500 font-mono mb-1">Day {dayIndex} of 30 · ERA5 Mumbai</div>
                  <div className="text-2xl font-black text-slate-800">{found.date}</div>
                  <div className="text-xs text-slate-500 mt-0.5">LightGBM-Tuned (recursive multi-step)</div>
                </div>

                {/* Centre: WBGT value */}
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Predicted WBGT</div>
                  <div className="text-5xl font-black" style={{ color: catInfo.color }}>{found.wbgt.toFixed(2)}°C</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-lg">{catInfo.icon}</span>
                    <span className="text-sm font-bold" style={{ color: catInfo.color }}>{catInfo.label}</span>
                  </div>
                </div>

                {/* Right: heat stress verdict */}
                <div className={`rounded-xl px-6 py-4 text-center ${isHS ? "bg-red-100 border border-red-200" : "bg-green-100 border border-green-200"}`}>
                  <div className="text-xs text-slate-500 mb-1">Heat Stress Status</div>
                  <div className="text-3xl mb-1">{isHS ? "⚠️" : "✅"}</div>
                  <div className={`text-lg font-black ${isHS ? "text-red-700" : "text-green-700"}`}>
                    {isHS ? "HEAT STRESS" : "NO HEAT STRESS"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    WBGT {isHS ? "≥" : "<"} {ERA5_HS_THRESHOLD}°C threshold
                  </div>
                </div>
              </div>

              {/* Health advisory */}
              <div className="mt-3 p-3 rounded-xl text-xs" style={{ backgroundColor: catInfo.color + "12", color: catInfo.color }}>
                <strong>Health Advisory:</strong> {catInfo.health}
              </div>

              {/* Relative to forecast */}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>📊 30-day avg: {(ERA5_FORECAST.reduce((s,d)=>s+d.wbgt,0)/30).toFixed(2)}°C</span>
                <span>⬆️ Max forecast: {Math.max(...ERA5_FORECAST.map(d=>d.wbgt)).toFixed(2)}°C</span>
                <span>⬇️ Min forecast: {Math.min(...ERA5_FORECAST.map(d=>d.wbgt)).toFixed(2)}°C</span>
                <span>🔴 HS days in window: {ERA5_HS_COUNT}/30</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              {inputDate
                ? `📅 ${inputDate} is outside the forecast window (${FORECAST_MIN_DATE} → ${FORECAST_MAX_DATE}). Please select a date within this range.`
                : "Select a date above to look up the WBGT forecast."}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ═══ IMD: HI CLASSIFICATION MODULE ═══════════════════════════════════════
function HIClassification({ station, apiUrl }) {
  const [DBT, setDBT] = useState(35);
  const [RH, setRH]   = useState(70);
  const [WBT, setWBT] = useState(28.5);
  const [DPT, setDPT] = useState(27);
  const [VP, setVP]    = useState(35.6);
  const [FFF, setFFF]  = useState(10);
  const [month, setMonth]     = useState(4);
  const [hourCode, setHourCode] = useState(36);

  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [apiOk, setApiOk]       = useState(false);

  useEffect(() => {
    if (apiUrl) {
      fetch(`${apiUrl}/health`, {headers:{"ngrok-skip-browser-warning":"true"}}).then(r=>r.json())
        .then(d => { if(d.status==="ok") setApiOk(true) })
        .catch(() => setApiOk(false));
    }
  }, [apiUrl]);

  const derived = useMemo(() =>
    computeDerivedFeatures({ DBT, RH, WBT, DPT, VP, FFF, month, hourCode }),
  [DBT, RH, WBT, DPT, VP, FFF, month, hourCode]);

  const localHI = useMemo(() => {
    const hiC = computeHI(DBT, RH);
    let cat = 0;
    if (hiC >= 46) cat = 3; else if (hiC >= 39) cat = 2; else if (hiC >= 33) cat = 1;
    return { hiC: hiC.toFixed(1), cat };
  }, [DBT, RH]);

  const featureContributions = useMemo(() => {
    const features = derived;
    const entries = Object.entries(FEATURE_IMPORTANCE).map(([name, importance]) => {
      const val = features[name];
      let contribution = 0;
      if (name === "DBT") contribution = (val - 25) / 20 * importance;
      else if (name === "WBT") contribution = (val - 20) / 15 * importance;
      else if (name === "VPD") contribution = (10 - val) / 15 * importance;
      else if (name === "VP") contribution = (val - 20) / 30 * importance;
      else if (name === "DPT") contribution = (val - 20) / 15 * importance;
      else if (name === "Temp_RH") contribution = (val - 20) / 25 * importance;
      else if (name === "FFF") contribution = (15 - val) / 20 * importance;
      else if (name === "WBD") contribution = (5 - val) / 10 * importance;
      else if (name === "Month_cos") contribution = -val * importance * 0.5;
      else if (name === "Hour_cos") contribution = -val * importance * 0.5;
      return { name, value: val !== undefined ? (typeof val === 'number' ? val.toFixed(2) : val) : 'N/A', importance, contribution: Math.max(-1, Math.min(1, contribution)) };
    });
    return entries.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }, [derived]);

  async function predictWithModel() {
    setLoading(true);
    try {
      const body = { station };
      for (const f of ['DBT','WBT','VPD','VP','DPT','Temp_RH','FFF','Month_cos','Hour_cos','WBD']) {
        body[f] = derived[f];
      }
      const res = await fetch(`${apiUrl}/predict/hi`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      alert("API Error: " + e.message);
      setResult(null);
    }
    setLoading(false);
  }

  const display = result
    ? { hiC: result.hi_value, cat: result.predicted_class, probs: result.probabilities, base: result.base_models, src: "model" }
    : { hiC: localHI.hiC, cat: localHI.cat, probs: null, base: null, src: "formula" };
  const catInfo = HI_CATS[display.cat];
  const sInfo = STATIONS[station];

  return (
    <div className="space-y-5">
      {apiUrl && (
        <div className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-3 ${
          apiOk ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"
        }`}>
          <span className="text-lg">{apiOk ? "🟢" : "🟡"}</span>
          <span className="font-medium">{apiOk ? "Connected to SAINT-XGB-Stack on Colab" : "API offline — using Rothfusz formula"}</span>
          <span className="text-xs opacity-50 ml-auto font-mono">{apiUrl}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-1">🌡️ HI Classification — {sInfo.name} ({station})</h3>
          <p className="text-xs text-slate-400 mb-5">Enter observed weather parameters to classify heat stress risk</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InputField label="DBT" unit="°C" value={DBT} onChange={v=>{setDBT(v);setResult(null)}} min={10} max={50} step={0.5} hint="Dry Bulb Temperature" />
            <InputField label="RH" unit="%" value={RH} onChange={v=>{setRH(v);setResult(null)}} min={5} max={100} hint="Relative Humidity" />
            <InputField label="WBT" unit="°C" value={WBT} onChange={v=>{setWBT(v);setResult(null)}} min={5} max={40} step={0.5} hint="Wet Bulb Temperature" />
            <InputField label="DPT" unit="°C" value={DPT} onChange={v=>{setDPT(v);setResult(null)}} min={0} max={35} step={0.5} hint="Dew Point Temperature" />
            <InputField label="VP" unit="hPa" value={VP} onChange={v=>{setVP(v);setResult(null)}} min={2} max={60} step={0.5} hint="Vapour Pressure" />
            <InputField label="FFF" unit="km/h" value={FFF} onChange={v=>{setFFF(v);setResult(null)}} min={0} max={80} hint="Wind Speed" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Month</label>
              <select value={month} onChange={e=>{setMonth(+e.target.value);setResult(null)}}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Observation Time</label>
              <select value={hourCode} onChange={e=>{setHourCode(+e.target.value);setResult(null)}}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                {HR_OPTIONS.map(h => <option key={h.code} value={h.code}>{h.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 mb-2">Auto-computed Derived Features</div>
            <div className="grid grid-cols-5 gap-2 text-xs">
              {[["VPD", derived.VPD?.toFixed(2), "hPa"], ["Temp_RH", derived.Temp_RH?.toFixed(2), ""], ["WBD", derived.WBD?.toFixed(2), "°C"], ["Month_cos", derived.Month_cos?.toFixed(3), ""], ["Hour_cos", derived.Hour_cos?.toFixed(3), ""]].map(([n, v, u]) => (
                <div key={n} className="bg-white rounded-lg p-2 text-center border border-slate-100">
                  <div className="text-slate-400 text-[10px]">{n}</div>
                  <div className="font-semibold text-slate-700">{v}</div>
                  {u && <div className="text-slate-300 text-[10px]">{u}</div>}
                </div>
              ))}
            </div>
          </div>
          {apiOk ? (
            <button onClick={predictWithModel} disabled={loading}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white text-sm tracking-wide bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-teal-600/20">
              {loading ? "⏳ Running SAINT-XGB-Stack..." : "🧠 Predict with Deployed Model"}
            </button>
          ) : (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-600 text-center">
              {apiUrl ? "Waiting for Colab API..." : "No API configured — showing formula-based HI. Configure Colab API on home screen for model predictions."}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">
              {display.src === "model" ? "SAINT-XGB-Stack" : "Rothfusz / NOAA Formula"}
            </div>
            <div className="text-5xl font-black mb-1" style={{ color: catInfo.color }}>{display.hiC}°C</div>
            <div className="text-sm text-slate-500 mb-3">Heat Index</div>
            <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: catInfo.color + "15", border: `2px solid ${catInfo.color}40` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{catInfo.icon}</span>
                <span className="font-bold text-sm" style={{ color: catInfo.color }}>{catInfo.label}</span>
              </div>
              <div className="text-xs text-slate-600">{catInfo.health}</div>
            </div>
            {display.probs && (
              <div className="space-y-1.5">
                {HI_CATS.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-[10px] text-slate-400 w-16">{c.label}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(display.probs[i]||0)*100}%`, backgroundColor: c.color }} />
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 w-10 text-right">{((display.probs[i]||0)*100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Feature Contributions</div>
            {featureContributions.slice(0,6).map((f, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-medium text-slate-700">{f.name}</span>
                  <span className="text-slate-400 font-mono">{f.value}</span>
                </div>
                <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="absolute top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.abs(f.contribution)*60+10}%`, backgroundColor: f.contribution > 0 ? "#DC2626" : "#16A34A", left: f.contribution > 0 ? "40%" : `${40-Math.abs(f.contribution)*60}%` }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Model Comparison — F1 Macro (Test)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MODEL_HI[station]} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 1]} fontSize={10} />
              <YAxis type="category" dataKey="model" fontSize={10} width={130} />
              <Tooltip formatter={v => v.toFixed(4)} />
              <Bar dataKey="f1" radius={[0, 4, 4, 0]}>
                {MODEL_HI[station].map((e, i) => <Cell key={i} fill={i === 0 ? "#E05A3A" : "#94A3B8"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3">★ SAINT-XGB-Stack — {sInfo.name}</h4>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: "F1 Macro", val: sInfo.f1, color: "#E05A3A" }, { label: "Accuracy", val: sInfo.acc, color: "#1B2B4B" }, { label: "Very High Sensitivity", val: sInfo.vhSens, color: "#DC2626" }, { label: "Cohen's Kappa", val: sInfo.kappa, color: "#7C3AED" }].map((s, i) => (
              <div key={i} className="text-center p-3 bg-slate-50 rounded-xl">
                <div className="text-[10px] text-slate-400 mb-1">{s.label}</div>
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
            <strong>Architecture:</strong> SAINT (d=32, 4 heads, 2 layers) + XGBoost (200 trees, depth=5) + RF (300 trees) → LR meta-learner | 3-fold stratified CV | SMOTE-ENN balanced training
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Heat Index Classification Reference (Desai et al., 2021)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HI_CATS.map((c, i) => (
            <div key={i} className="rounded-xl p-4 text-center border-2" style={{ borderColor: c.color + "30", backgroundColor: c.color + "06" }}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="font-bold text-sm" style={{ color: c.color }}>{c.label}</div>
              <div className="text-xs text-slate-500 mt-1">{c.range}</div>
              <div className="text-[10px] text-slate-400 mt-2">{c.health}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══ IMD: CORRELATION MODULE ══════════════════════════════════════════════

// ═══ CORRELATION MODULE — Colaba (43057) × HI Only ══════════════════════
function CorrelationAnalysis({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-teal-900 via-slate-800 to-teal-900 text-white px-5 py-3 flex items-center gap-4 shadow-xl sticky top-0 z-50">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← Back</button>
        <div className="h-5 w-px bg-slate-700" />
        <span className="font-bold">Pollution × HI Correlation</span>
        <span className="text-xs text-teal-300 font-mono ml-auto">Colaba (43057) | MPCB MH013 | June 2019 – Dec 2025</span>
      </div>
      <div className="max-w-6xl mx-auto p-5 space-y-5">
        {/* Main Correlation Chart + Table */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-1">🔗 Pollutant × Heat Index Correlation — Colaba (43057)</h3>
          <p className="text-xs text-slate-400 mb-5">Spearman rank correlation (rs) | n = 5,493 matched observations | IMD 43057 × MPCB MH013 | Period: June 2019 – Dec 2025</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Spearman rs vs Heat Index</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={CORR_DATA} layout="vertical" margin={{ left: 5, right: 20 }}>
                  <XAxis type="number" domain={[-0.45, 0.15]} fontSize={10} />
                  <YAxis type="category" dataKey="poll" fontSize={11} width={55} />
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <Tooltip formatter={v => `rs = ${v.toFixed(3)}`} />
                  <Bar dataKey="r" radius={[0, 4, 4, 0]}>
                    {CORR_DATA.map((e, i) => <Cell key={i} fill={e.r < 0 ? "#3B82F6" : "#EF4444"} opacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Negative (heat up = pollution down)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Positive</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Correlation table</h4>
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-800 text-white text-xs">
                  <th className="px-3 py-2 text-left rounded-tl-lg">Pollutant</th>
                  <th className="px-3 py-2 text-center">rs</th>
                  <th className="px-3 py-2 text-center">Sig.</th>
                  <th className="px-3 py-2 text-left rounded-tr-lg">Interpretation</th>
                </tr></thead>
                <tbody>
                  {CORR_DATA.map((d, i) => (
                    <tr key={i} className={`${i%2?"bg-slate-50":""} hover:bg-slate-100 transition-colors`}>
                      <td className="px-3 py-2 font-semibold">{d.poll}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold" style={{color:d.r<0?"#3B82F6":"#EF4444"}}>{d.r>0?"+":""}{d.r.toFixed(3)}</td>
                      <td className="px-3 py-2 text-center text-xs">{d.sig}</td>
                      <td className="px-3 py-2 text-xs">{d.r<-0.15?"Strong inverse":d.r<-0.05?"Weak inverse":d.r>0.05?"Weak positive":"Not significant"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Seasonal Chart */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-1">Seasonal variation of correlation</h4>
          <p className="text-xs text-slate-400 mb-4">How HI–pollutant relationship changes across Mumbai's 4 seasons</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={SEASONAL_CORR} margin={{left:0,right:10}}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="season" fontSize={11} />
              <YAxis domain={[-0.4,0.45]} fontSize={10} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="PM25" stroke="#E05A3A" strokeWidth={2.5} dot={{r:5}} name="PM2.5" />
              <Line type="monotone" dataKey="NO2" stroke="#1B2B4B" strokeWidth={2.5} dot={{r:5}} name="NO2" />
              <Line type="monotone" dataKey="CO" stroke="#0A8A80" strokeWidth={2.5} dot={{r:5}} name="CO" />
              <Line type="monotone" dataKey="Ozone" stroke="#EA580C" strokeWidth={2.5} dot={{r:5}} name="Ozone" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
            <strong>Key insight:</strong> During monsoon (Jun–Sep), PM2.5 × HI correlation <strong>flips to positive</strong> — rain suppresses both heat and pollution simultaneously. Winter shows the strongest negative correlations due to temperature inversions.
          </div>
        </Card>

        {/* Key Findings */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-4">Key findings — Colaba (43057) × HI</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {icon:"🌡️",title:"Higher heat = lower pollution",desc:"NO2 (rs=−0.320), PM2.5 (−0.281), PM10 (−0.272) all show significant inverse relationships. Hot conditions promote atmospheric vertical mixing, dispersing ground-level pollutants.",color:"#3B82F6"},
              {icon:"🌧️",title:"Monsoon reversal",desc:"During monsoon (Jun–Sep), PM2.5 × HI correlation flips positive. Rain suppresses both heat and pollution simultaneously. On rare dry monsoon days, both spike together.",color:"#0A8A80"},
              {icon:"⏰",title:"6-hour diurnal offset",desc:"PM2.5 peaks at 8 AM (traffic rush hour), HI peaks at 2 PM (solar heating). This temporal mismatch within each day drives the negative daily-scale correlation.",color:"#EA580C"},
              {icon:"✅",title:"Non-concurrent hazards",desc:"Cross-tabulation confirms 90% of Very High HI observations have Good/Satisfactory AQI. Heat waves and pollution episodes are separate, non-overlapping public health hazards.",color:"#16A34A"},
            ].map((f,i) => (
              <div key={i} className="p-4 rounded-xl" style={{backgroundColor:f.color+"06",borderLeft:`4px solid ${f.color}`}}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="font-bold text-sm" style={{color:f.color}}>{f.title}</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Details */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Data and methodology</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-teal-50 rounded-xl">
              <div className="font-bold text-teal-800 mb-2">IMD station 43057</div>
              <div className="text-teal-700 space-y-1">
                <div>Location: Colaba (coastal Mumbai)</div>
                <div>Data: Synoptic hourly weather</div>
                <div>HI computed from DBT and RH</div>
                <div>Period: 1969–2025 (56 years)</div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="font-bold text-blue-800 mb-2">MPCB station MH013</div>
              <div className="text-blue-700 space-y-1">
                <div>Location: Colaba air quality</div>
                <div>7 pollutants: PM2.5, PM10, NO2, NH3, SO2, CO, Ozone</div>
                <div>Period: June 2019 – Dec 2025</div>
                <div>Matched observations: 5,493</div>
              </div>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl">
              <div className="font-bold text-violet-800 mb-2">Methodology</div>
              <div className="text-violet-700 space-y-1">
                <div>Spearman rank correlation (rs)</div>
                <div>Non-parametric, robust to outliers</div>
                <div>Captures monotonic relationships</div>
                <div>Significance: *** p {"<"} 0.001</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ERA5ForecastModule({ onBack }) {
  const chartData = ERA5_FORECAST.map(d => ({
    ...d, dateShort: d.date.slice(5),
    fill: d.hs === "YES" ? "#EF4444" : "#22C55E",
  }));

  const minW = Math.min(...ERA5_FORECAST.map(d=>d.wbgt));
  const maxW = Math.max(...ERA5_FORECAST.map(d=>d.wbgt));
  const avgW = (ERA5_FORECAST.reduce((s,d)=>s+d.wbgt,0)/30).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-900 via-slate-800 to-blue-900 text-white px-5 py-3 flex items-center gap-4 shadow-xl sticky top-0 z-50">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">← Data Source</button>
        <div className="h-5 w-px bg-slate-700" />
        <span className="font-bold">ERA5 Daily — 30-Day WBGT Forecast</span>
        <span className="text-xs text-blue-300 font-mono ml-auto">LightGBM-Tuned | Recursive Multi-Step</span>
      </div>

      <div className="max-w-6xl mx-auto p-5 space-y-5">
        {/* Model banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <span>📈</span>
              <span className="font-bold text-blue-800 text-sm">LightGBM-Tuned (Optuna HPO)</span>
              <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-semibold">Regression</span>
            </div>
            <p className="text-xs text-blue-700">WBGT prediction — MAE 0.129°C | Accuracy 97.75% | F1 0.9707</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
            <div className="flex items-center gap-2 mb-1">
              <span>🧠</span>
              <span className="font-bold text-violet-800 text-sm">DNN-CW-BBAG</span>
              <span className="ml-auto text-xs bg-violet-200 text-violet-800 px-2 py-0.5 rounded-full font-semibold">Classifier</span>
            </div>
            <p className="text-xs text-violet-700">Heat Stress YES/NO — AUC 0.9976 | Accuracy 97.43% | F1 0.9666</p>
          </div>
        </div>

        {/* ★ DATE LOOKUP — placed prominently at top ★ */}
        <DateLookup />

        {/* Summary Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-1">🌡️ 30-Day WBGT Forecast — Mumbai</h3>
          <p className="text-xs text-slate-400 mb-5">
            Forecast start: 2026-03-14 | Method: LightGBM-Tuned recursive multi-step | Threshold: {ERA5_HS_THRESHOLD}°C
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              {label:"Heat Stress Days",  value:`${ERA5_HS_COUNT}/30`,    color:"#DC2626", sub:`${Math.round(ERA5_HS_COUNT/30*100)}%`},
              {label:"Normal Days",       value:`${30-ERA5_HS_COUNT}/30`, color:"#22C55E", sub:"Below threshold"},
              {label:"Peak WBGT",         value:`${maxW.toFixed(2)}°C`,   color:"#7C3AED", sub:"Maximum"},
              {label:"Min WBGT",          value:`${minW.toFixed(2)}°C`,   color:"#2563EB", sub:"Minimum"},
              {label:"Average",           value:`${avgW}°C`,              color:"#D97706", sub:"30-day mean"},
            ].map((s,i) => (
              <div key={i} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 mb-1">{s.label}</div>
                <div className="text-xl font-bold" style={{color:s.color}}>{s.value}</div>
                <div className="text-[10px] text-slate-400 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          <h4 className="text-sm font-bold text-slate-700 mb-2">WBGT Forecast Timeline</h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{left:0,right:10,top:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="dateShort" fontSize={9} angle={-45} textAnchor="end" height={50} />
              <YAxis domain={[29,33]} fontSize={10} tickFormatter={v=>`${v}°C`} />
              <Tooltip formatter={(v,n)=>[`${v}°C`, n==="wbgt"?"WBGT":n]} labelFormatter={l=>`Date: 2026-${l}`} />
              <Legend />
              <Line type="monotone" dataKey="wbgt" stroke="#E84855" strokeWidth={2.5} dot={{r:4,fill:"#E84855"}} name="Predicted WBGT" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar Chart */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Daily Forecast — Red = Heat Stress, Green = Normal</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{left:0,right:10}}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="dateShort" fontSize={8} angle={-45} textAnchor="end" height={50} />
              <YAxis domain={[0,33]} fontSize={10} tickFormatter={v=>`${v}°C`} />
              <Tooltip formatter={v=>[`${v}°C`,"WBGT"]} labelFormatter={l=>`2026-${l}`} />
              <Bar dataKey="wbgt" radius={[3,3,0,0]} name="WBGT">
                {chartData.map((d,i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 text-xs text-slate-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Heat Stress (≥{ERA5_HS_THRESHOLD}°C)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Normal</span>
          </div>
        </Card>

        {/* Forecast Table */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3">30-Day Forecast Table</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-800 text-white text-xs">
                <th className="px-3 py-2 text-left rounded-tl-lg">#</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-center">WBGT (°C)</th>
                <th className="px-3 py-2 text-center">Heat Stress</th>
                <th className="px-3 py-2 text-center rounded-tr-lg">Status</th>
              </tr></thead>
              <tbody>
                {ERA5_FORECAST.map((d,i) => {
                  const isHS = d.hs === "YES";
                  return (
                    <tr key={i} className={`${isHS?"bg-red-50":i%2?"bg-slate-50":""} hover:bg-slate-100 transition-colors`}>
                      <td className="px-3 py-2 text-xs text-slate-400">{i+1}</td>
                      <td className="px-3 py-2 font-medium">{d.date}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold" style={{color:isHS?"#DC2626":"#16A34A"}}>{d.wbgt.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isHS?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>
                          {isHS?"YES":"NO"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-lg">{isHS?"🔴":"🟢"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
            <strong>Total Heat Stress days:</strong> {ERA5_HS_COUNT}/30 ({Math.round(ERA5_HS_COUNT/30*100)}%) |
            <strong> Method:</strong> LightGBM-Tuned (recursive multi-step) |
            <strong> Threshold:</strong> WBGT ≥ {ERA5_HS_THRESHOLD}°C
          </div>
        </Card>

        {/* Key Findings */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-4">Key Findings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {icon:"🌡️",title:"90% Heat Stress Forecast",desc:`${ERA5_HS_COUNT} of 30 days predicted as heat stress (WBGT ≥ ${ERA5_HS_THRESHOLD}°C). Mumbai's pre-monsoon (March–May) is the most dangerous period.`,color:"#DC2626"},
              {icon:"📈",title:"Rising Trend",desc:"WBGT increases from ~30°C in mid-March to ~31.9°C by mid-April — intensifying heat stress as summer progresses toward peak pre-monsoon.",color:"#D97706"},
              {icon:"🎯",title:"Model Accuracy",desc:"LightGBM-Tuned achieves MAE 0.129°C on test data. Optuna optimized over 50 trials. Predictions within 0.13°C of actual WBGT on held-out data.",color:"#2563EB"},
              {icon:"✅",title:"Sanity Verified",desc:"Forecast matches last year's same-period pattern. 27/30 days within historical ±2SD. Seasonal behaviour consistent — model captures Mumbai's climate cycle.",color:"#16A34A"},
            ].map((f,i) => (
              <div key={i} className="p-4 rounded-xl" style={{backgroundColor:f.color+"06",borderLeft:`4px solid ${f.color}`}}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="font-bold text-sm" style={{color:f.color}}>{f.title}</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Data & Model Details */}
        <Card className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Model & Data Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="font-bold text-blue-800 mb-2">🌍 ERA5 Data</div>
              <div className="text-blue-700 space-y-1">
                <div>Source: ECMWF ERA5 Reanalysis</div>
                <div>Location: Mumbai (0.25° grid)</div>
                <div>Period: 2015 – 2026</div>
                <div>Resolution: Daily | Records: 4,091</div>
                <div>Parameters: 13 meteorological</div>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <div className="font-bold text-green-800 mb-2">📊 Features</div>
              <div className="text-green-700 space-y-1">
                <div>Raw: Tmax, RH, u10, v10, SR, BLH,</div>
                <div>MSLP, TCWV, SM, SST, SNSR, SP, HGT</div>
                <div>Engineered: 70+ features</div>
                <div>Total: ~142 features | Target: WBGT</div>
              </div>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl">
              <div className="font-bold text-violet-800 mb-2">🧠 Models Compared</div>
              <div className="text-violet-700 space-y-1">
                <div>★ LightGBM-Tuned (best regression)</div>
                <div>DNN-CW-BBAG (best classifier)</div>
                <div>XGBoost, CatBoost, TabNet</div>
                <div>iTransformer, PatchTST, N-HiTS</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══ MAIN DASHBOARD ══════════════════════════════════════════════════════

// ═══ MAIN DASHBOARD ══════════════════════════════════════════════════════
export default function Dashboard() {
  const [dataSource, setDataSource] = useState(null); // 'era5' | 'imd' | 'corr'
  const [station, setStation]   = useState(null);
  const [apiUrl, setApiUrl]     = useState("");
  const [showCfg, setShowCfg]   = useState(false);

  // ERA5 path
  if (dataSource === "era5") {
    return <ERA5ForecastModule onBack={() => setDataSource(null)} />;
  }

  // Correlation path (Colaba only)
  if (dataSource === "corr") {
    return <CorrelationAnalysis onBack={() => setDataSource(null)} />;
  }

  // IMD: Station Selection
  if (dataSource === "imd" && !station) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <button onClick={() => setDataSource(null)} className="text-slate-400 hover:text-white text-sm mb-5 inline-flex items-center gap-1">← Back</button>
            <h1 className="text-3xl font-black text-white mb-1">IMD HI Classification</h1>
            <p className="text-teal-300 text-sm">Select an observation station</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(STATIONS).map(([id, s]) => (
              <button key={id} onClick={() => setStation(id)}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7 text-left hover:bg-white/15 transition-all duration-300 hover:scale-[1.03] group">
                <div className="text-xs text-teal-400 font-mono mb-2">Station {id}</div>
                <div className="text-3xl font-black text-white mb-1">{s.name}</div>
                <div className="text-sm text-slate-300 mb-4">{s.type}</div>
                <div className="flex gap-4 text-xs text-slate-400"><span>{s.records} records</span><span>F1 = {s.f1}</span></div>
                <div className="mt-4 text-xs text-teal-500 group-hover:text-teal-300 font-medium">Select →</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // IMD: HI Classification (directly, no module selection needed)
  if (dataSource === "imd" && station) {
    const sInfo = STATIONS[station];
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center gap-4 shadow-xl sticky top-0 z-50">
          <button onClick={() => setStation(null)} className="text-slate-400 hover:text-white text-sm">← Change Station</button>
          <div className="h-5 w-px bg-slate-700" />
          <span className="font-bold">{sInfo.name}</span>
          <span className="text-xs text-slate-500 font-mono">{station}</span>
          <span className="ml-auto text-xs bg-red-800 text-red-200 px-3 py-1 rounded-full">HI Classification</span>
        </div>
        <div className="max-w-6xl mx-auto p-5">
          <HIClassification station={station} apiUrl={apiUrl} />
        </div>
      </div>
    );
  }

  // TOP-LEVEL: 3 Data Source Cards
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🌡️</div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Mumbai Heat Stress</h1>
          <h2 className="text-xl font-light text-teal-300 mb-1">Classification & Prediction Dashboard</h2>
          <p className="text-sm text-slate-400 mt-3">Nambiar et al. (2026) — SAINT-XGB-Stack · LightGBM-Tuned · DNN-CW-BBAG</p>
        </div>

        {/* API Config */}
        <div className="mb-7 text-center">
          <button onClick={() => setShowCfg(!showCfg)} className="text-xs text-slate-400 hover:text-teal-300">
            ⚙️ {showCfg ? "Hide" : "Configure"} Colab API (for IMD live predictions)
          </button>
          {showCfg && (
            <div className="mt-3 bg-white/10 backdrop-blur-md rounded-xl p-5 max-w-md mx-auto border border-white/10">
              <label className="text-xs text-slate-300 block mb-2 text-left font-medium">Ngrok URL from Colab</label>
              <input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value.replace(/\/$/, ""))}
                placeholder="https://xxxx.ngrok-free.app"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-400" />
              <p className="text-[10px] text-slate-500 mt-2 text-left">Needed only for IMD HI live predictions. ERA5 and Correlation use pre-computed results.</p>
            </div>
          )}
        </div>

        {/* 3 Data Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          {/* IMD Card */}
          <button onClick={() => setDataSource("imd")}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left hover:bg-white/15 transition-all duration-300 hover:scale-[1.03] hover:border-teal-500/40 group">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🌡️</span>
              <div>
                <div className="text-xs text-teal-400 font-mono mb-0.5">IMD Synoptic</div>
                <div className="text-xl font-black text-white">HI Classification</div>
              </div>
            </div>
            <div className="text-sm text-slate-300 mb-4">SAINT-XGB-Stack ensemble predicts Heat Index risk from 10 weather features. Live model deployed on Colab.</div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Period</div><div className="text-white font-semibold">1969–2025</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Stations</div><div className="text-white font-semibold">2 (IMD)</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Best F1</div><div className="text-teal-300 font-semibold">0.9561</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Records</div><div className="text-white font-semibold">215,299</div></div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-[10px] bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded-full">SAINT-XGB-Stack</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Santacruz</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Colaba</span>
            </div>
            <div className="text-xs text-teal-500 group-hover:text-teal-300 font-medium">Open →</div>
          </button>

          {/* ERA5 Card */}
          <button onClick={() => setDataSource("era5")}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left hover:bg-white/15 transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/40 group">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🌍</span>
              <div>
                <div className="text-xs text-blue-400 font-mono mb-0.5">ERA5 Reanalysis</div>
                <div className="text-xl font-black text-white">WBGT Forecast</div>
              </div>
            </div>
            <div className="text-sm text-slate-300 mb-4">LightGBM-Tuned 30-day WBGT forecast with heat stress classification. Recursive multi-step prediction.</div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Period</div><div className="text-white font-semibold">2015–2026</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Records</div><div className="text-white font-semibold">4,091 days</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Best MAE</div><div className="text-blue-300 font-semibold">0.129°C</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Forecast</div><div className="text-red-300 font-semibold">27/30 HS</div></div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full">LightGBM-Tuned</span>
              <span className="text-[10px] bg-violet-900/60 text-violet-300 px-2 py-0.5 rounded-full">DNN-CW-BBAG</span>
            </div>
            <div className="text-xs text-blue-400 group-hover:text-blue-200 font-medium">Open →</div>
          </button>

          {/* Correlation Card */}
          <button onClick={() => setDataSource("corr")}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left hover:bg-white/15 transition-all duration-300 hover:scale-[1.03] hover:border-orange-500/40 group">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🔗</span>
              <div>
                <div className="text-xs text-orange-400 font-mono mb-0.5">Colaba × HI</div>
                <div className="text-xl font-black text-white">Pollution Corr.</div>
              </div>
            </div>
            <div className="text-sm text-slate-300 mb-4">Spearman correlation between 7 air pollutants and Heat Index at Colaba. Seasonal variation and diurnal patterns.</div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Station</div><div className="text-white font-semibold">43057 Colaba</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Pollutants</div><div className="text-white font-semibold">7 + AQI</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Strongest</div><div className="text-blue-300 font-semibold">NO2 −0.320</div></div>
              <div className="bg-white/5 rounded-lg p-2"><div className="text-slate-400">Observations</div><div className="text-white font-semibold">5,493</div></div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-[10px] bg-orange-900/60 text-orange-300 px-2 py-0.5 rounded-full">Spearman rs</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">MPCB MH013</span>
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Seasonal</span>
            </div>
            <div className="text-xs text-orange-400 group-hover:text-orange-200 font-medium">Open →</div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-2">IMD: 56 years hourly synoptic | ERA5: 11 years daily reanalysis | Correlation: Colaba HI × 7 pollutants</p>
      </div>
    </div>
  );
}
