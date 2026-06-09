import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";

const EXERCISES = [
  { id: "pushup", label: "Push-ups", unit: "reps" },
  { id: "pullup", label: "Pull-ups", unit: "reps" },
  { id: "dip", label: "Dips", unit: "reps" },
  { id: "row", label: "Rows", unit: "reps" },
  { id: "plank", label: "Plank", unit: "sec" },
  { id: "shoulder_press", label: "Shoulder Press", unit: "reps" },
  { id: "bicep_curl", label: "Bicep Curls", unit: "reps" },
  { id: "tricep_ext", label: "Tricep Ext.", unit: "reps" },
];

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}
function fmtDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}min`;
}
function dayLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function hrColor(hr) {
  if (!hr) return "#4b5563";
  if (hr < 120) return "#22c55e";
  if (hr < 140) return "#84cc16";
  if (hr < 160) return "#f59e0b";
  if (hr < 175) return "#f97316";
  return "#ef4444";
}

const S = {
  page: { fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0a0a0f", minHeight: "100vh", color: "#e2e8f0", maxWidth: 520, margin: "0 auto" },
  header: { padding: "24px 20px 0", borderBottom: "1px solid #1e2030" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  label: { fontSize: 11, letterSpacing: "0.2em", color: "#64748b", textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "bold", color: "#f1f5f9", letterSpacing: "-0.02em" },
  nav: { display: "flex", gap: 0, marginTop: 20 },
  navBtn: (active) => ({ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent", color: active ? "#93c5fd" : "#475569", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }),
  body: { padding: "20px 20px 80px" },
  card: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: 16, marginBottom: 10 },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 },
  statCard: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: "12px 10px", textAlign: "center" },
  insight: { background: "#0f111a", border: "1px solid #1e3a5f", borderLeft: "3px solid #3b82f6", borderRadius: 8, padding: "14px 16px", marginBottom: 20 },
  sectionLabel: { fontSize: 10, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 },
  dot: (color) => ({ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginLeft: 2 }),
  pill: { background: "#12151e", border: "1px solid #1e2030", borderRadius: 4, padding: "3px 7px", fontSize: 10, color: "#64748b" },
  input: { width: "100%", background: "#0f1117", border: "1px solid #1e2030", borderRadius: 6, padding: "10px 12px", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" },
  btn: (variant = "primary") => ({
    padding: "10px 18px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "inherit",
    ...(variant === "primary" ? { background: "#1e3a5f", color: "#93c5fd", border: "1px solid #2563eb" } : {}),
    ...(variant === "ghost" ? { background: "none", color: "#475569", border: "1px solid #1e2030" } : {}),
    ...(variant === "success" ? { background: "#14532d", color: "#86efac", border: "1px solid #16a34a" } : {}),
  }),
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [connected, setConnected] = useState(null);
  const [runs, setRuns] = useState([]);
  const [strength, setStrength] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(null);
  const [enrichForm, setEnrichForm] = useState({ exercises: {}, sessionNotes: "" });
  const [saving, setSaving] = useState(false);
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const insightDone = useRef(false);

  // Check auth + load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const statusRes = await fetch("/api/auth/status");
        const status = await statusRes.json();
        setConnected(status.connected);

        if (status.connected) {
          const [actRes, notesRes] = await Promise.all([
            fetch("/api/activities"),
            fetch("/api/notes"),
          ]);
          const actData = await actRes.json();
          const notesData = await notesRes.json();
          setRuns(actData.runs || []);
          setStrength(actData.strength || []);
          setNotes(notesData.notes || {});
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // AI insight
  useEffect(() => {
    if (insightDone.current || runs.length === 0) return;
    insightDone.current = true;
    setInsightLoading(true);

    const recentRuns = runs.slice(0, 10).map(r => `${r.name} ${fmtDist(r.distance)} effort:${r.effort}`).join(", ");
    const strengthSummary = strength.length === 0
      ? "NONE recorded on Strava"
      : strength.slice(0, 5).map(s => `${s.name} ${fmtDuration(s.duration)}${s.avg_hr ? ` avg♥${s.avg_hr}` : ""}`).join(", ");

    fetch("/api/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recentRuns, strengthSummary, strengthCount: strength.length, runCount: runs.length }),
    })
      .then(r => r.json())
      .then(d => setInsight(d.insight || ""))
      .catch(() => {})
      .finally(() => setInsightLoading(false));
  }, [runs, strength]);

  async function saveNotes(activityId) {
    setSaving(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity_id: activityId, notes: enrichForm }),
    });
    setNotes(prev => ({ ...prev, [activityId]: enrichForm }));
    setSaving(false);
    setEnriching(null);
  }

  function openEnrich(activity) {
    setEnriching(activity.id);
    setEnrichForm(notes[activity.id] || { exercises: {}, sessionNotes: "" });
  }

  // Timeline: runs + strength merged, newest first
  const timeline = [...runs, ...strength].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  const totalRunKm = runs.reduce((acc, r) => acc + r.distance / 1000, 0);
  const recentStrength = [...strength].sort((a, b) => b.date.localeCompare(a.date));
  const lastStrength = recentStrength[0];
  const daysSince = lastStrength
    ? Math.floor((new Date() - new Date(lastStrength.date + "T12:00:00")) / 86400000)
    : null;

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", color: "#475569" }}>
        <div style={{ fontSize: 13, marginBottom: 8 }}>Loading...</div>
      </div>
    </div>
  );

  if (!connected) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32 }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>Upper Body Tracker</div>
        <div style={{ fontSize: 24, fontWeight: "bold", color: "#f1f5f9", marginBottom: 8 }}>Connect Strava</div>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, marginBottom: 28 }}>
          Links your real Strava data. Every strength session you record on your Forerunner will appear here alongside your runs — all the way back, not just the last 50.
        </div>
        <a href="/api/auth/login" style={{ display: "block", padding: "14px 24px", background: "#FC4C02", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Connect with Strava
        </a>
        <div style={{ fontSize: 10, color: "#334155", marginTop: 16 }}>
          Read-only access to your activities
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Upper Body Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerRow}>
            <div>
              <div style={S.label}>Strava · Live</div>
              <div style={S.title}>Upper Body</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>Total running</div>
              <div style={{ fontSize: 20, color: "#f97316", fontWeight: "bold" }}>{totalRunKm.toFixed(0)}km</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{runs.length} runs</div>
            </div>
          </div>
          <div style={S.nav}>
            {["dashboard", "strength", "runs"].map(v => (
              <button key={v} onClick={() => setView(v)} style={S.navBtn(view === v)}>{v}</button>
            ))}
          </div>
        </div>

        <div style={S.body}>

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (
            <>
              <div style={S.statGrid}>
                {[
                  { label: "Strength sessions", value: strength.length, color: "#3b82f6" },
                  { label: "Last session", value: daysSince === null ? "Never" : daysSince === 0 ? "Today" : `${daysSince}d ago`, color: daysSince === null ? "#ef4444" : "#f1f5f9" },
                  { label: "Run : strength", value: runs.length === 0 ? "—" : `${Math.round(runs.length / Math.max(strength.length, 1))}:1`, color: "#94a3b8" },
                ].map(s => (
                  <div key={s.label} style={S.statCard}>
                    <div style={{ fontSize: s.value.toString().length > 4 ? 14 : 22, fontWeight: "bold", color: s.color, paddingTop: 2 }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* AI insight */}
              <div style={S.insight}>
                <div style={{ fontSize: 9, color: "#3b82f6", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>AI Coach</div>
                {insightLoading
                  ? <div style={{ color: "#475569", fontSize: 13 }}>Analysing your training data...</div>
                  : <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.7 }}>{insight || "No insight yet."}</div>
                }
              </div>

              {/* No strength callout */}
              {strength.length === 0 && (
                <div style={{ background: "#0f1a0f", border: "1px solid #14532d", borderLeft: "3px solid #16a34a", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 9, color: "#16a34a", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>How to get started</div>
                  <div style={{ color: "#86efac", fontSize: 12, lineHeight: 1.8 }}>
                    Record your next upper body session on your Forerunner as <strong>Workout</strong> or <strong>Strength Training</strong>. Once it syncs to Strava, it'll appear here alongside all your runs — HR, calories, duration, all pulled in automatically.
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={S.sectionLabel}>Recent Activity</div>
              {timeline.map(a => {
                const isStr = ["WeightTraining","Workout","Crossfit","HighIntensityIntervalTraining","Yoga","Pilates"].includes(a.sport_type);
                const color = isStr ? "#3b82f6" : "#f97316";
                const actNotes = notes[a.id];
                return (
                  <div key={a.id} style={{ borderBottom: "1px solid #12151e", paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={S.dot(color)} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                          {dayLabel(a.date)}
                          {isStr && a.avg_hr && <span style={{ color: hrColor(a.avg_hr), marginLeft: 8 }}>♥ {Math.round(a.avg_hr)} avg</span>}
                          {isStr && a.max_hr && <span style={{ color: hrColor(a.max_hr), marginLeft: 4 }}>/ {Math.round(a.max_hr)} max</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {!isStr && a.distance > 0 && <div style={{ fontSize: 12, color: "#f97316" }}>{fmtDist(a.distance)}</div>}
                        {isStr && <div style={{ fontSize: 12, color: "#3b82f6" }}>{fmtDuration(a.duration)}</div>}
                        {a.calories > 0 && <div style={{ fontSize: 10, color: "#334155" }}>{a.calories}kcal</div>}
                      </div>
                    </div>
                    {isStr && enriching !== a.id && (
                      <div style={{ marginLeft: 18, marginTop: 6 }}>
                        {actNotes ? (
                          <ExercisePills notes={actNotes} onEdit={() => openEnrich(a)} />
                        ) : (
                          <button onClick={() => openEnrich(a)} style={{ background: "none", border: "1px solid #1e2030", borderRadius: 4, padding: "4px 10px", color: "#334155", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                            + add exercise breakdown
                          </button>
                        )}
                      </div>
                    )}
                    {isStr && enriching === a.id && (
                      <EnrichForm form={enrichForm} setForm={setEnrichForm} onSave={() => saveNotes(a.id)} onCancel={() => setEnriching(null)} saving={saving} />
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── STRENGTH ── */}
          {view === "strength" && (
            <>
              <div style={S.sectionLabel}>Strength Sessions ({strength.length} total)</div>
              {strength.length === 0 && (
                <div style={{ color: "#334155", fontSize: 13, textAlign: "center", paddingTop: 40, lineHeight: 1.8 }}>
                  No strength sessions on Strava yet.<br />
                  <span style={{ color: "#475569", fontSize: 11 }}>Record on your Forerunner as Workout or Strength Training.</span>
                </div>
              )}
              {recentStrength.map(s => {
                const actNotes = notes[s.id];
                return (
                  <div key={s.id} style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#e2e8f0" }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{dayLabel(s.date)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, color: "#3b82f6" }}>{fmtDuration(s.duration)}</div>
                        {s.calories > 0 && <div style={{ fontSize: 10, color: "#334155" }}>{s.calories}kcal</div>}
                      </div>
                    </div>
                    {(s.avg_hr || s.max_hr) && (
                      <div style={{ display: "flex", gap: 20, marginBottom: 10 }}>
                        {s.avg_hr && <div>
                          <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Avg HR</div>
                          <div style={{ fontSize: 22, color: hrColor(s.avg_hr), fontWeight: "bold" }}>{Math.round(s.avg_hr)}</div>
                        </div>}
                        {s.max_hr && <div>
                          <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Max HR</div>
                          <div style={{ fontSize: 22, color: hrColor(s.max_hr), fontWeight: "bold" }}>{Math.round(s.max_hr)}</div>
                        </div>}
                        {s.elevation > 0 && <div>
                          <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Elevation</div>
                          <div style={{ fontSize: 22, color: "#94a3b8", fontWeight: "bold" }}>{Math.round(s.elevation)}m</div>
                        </div>}
                      </div>
                    )}
                    {enriching === s.id ? (
                      <EnrichForm form={enrichForm} setForm={setEnrichForm} onSave={() => saveNotes(s.id)} onCancel={() => setEnriching(null)} saving={saving} />
                    ) : actNotes ? (
                      <ExercisePills notes={actNotes} onEdit={() => openEnrich(s)} />
                    ) : (
                      <button onClick={() => openEnrich(s)} style={{ background: "none", border: "1px solid #1e2030", borderRadius: 4, padding: "4px 10px", color: "#334155", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                        + add exercise breakdown
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ── RUNS ── */}
          {view === "runs" && (
            <>
              <div style={S.sectionLabel}>Runs ({runs.length} total · {totalRunKm.toFixed(0)}km)</div>
              {[...runs].sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid #12151e", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={S.dot("#f97316")} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                      {dayLabel(r.date)}
                      {r.avg_hr && <span style={{ color: hrColor(r.avg_hr), marginLeft: 8 }}>♥ {Math.round(r.avg_hr)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "#f97316" }}>{fmtDist(r.distance)}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{fmtDuration(r.duration)}</div>
                    {r.elevation > 0 && <div style={{ fontSize: 10, color: "#334155" }}>↑{Math.round(r.elevation)}m</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ExercisePills({ notes, onEdit }) {
  const hasExercises = Object.entries(notes.exercises || {}).some(([, v]) => v);
  return (
    <div>
      {hasExercises && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
          {Object.entries(notes.exercises || {}).filter(([, v]) => v).map(([k, v]) => {
            const ex = EXERCISES.find(e => e.id === k);
            return (
              <div key={k} style={S.pill}>
                <span style={{ color: "#94a3b8" }}>{ex?.label} </span>
                <span style={{ color: "#3b82f6" }}>{v}</span>
                <span style={{ color: "#334155" }}>{ex?.unit}</span>
              </div>
            );
          })}
        </div>
      )}
      {notes.sessionNotes && <div style={{ fontSize: 11, color: "#475569", fontStyle: "italic", marginBottom: 4 }}>{notes.sessionNotes}</div>}
      <button onClick={onEdit} style={{ background: "none", border: "none", color: "#334155", fontSize: 10, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>edit</button>
    </div>
  );
}

function EnrichForm({ form, setForm, onSave, onCancel, saving }) {
  return (
    <div style={{ background: "#0f1117", border: "1px solid #1e3a5f", borderRadius: 6, padding: 12, marginTop: 8 }}>
      <div style={{ fontSize: 9, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Exercise breakdown</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
        {EXERCISES.map(ex => (
          <div key={ex.id} style={{ background: "#12151e", borderRadius: 4, padding: "8px 10px" }}>
            <div style={{ fontSize: 9, color: "#475569", marginBottom: 3 }}>{ex.label}</div>
            <input type="number" placeholder="—"
              value={form.exercises?.[ex.id] || ""}
              onChange={e => setForm(f => ({ ...f, exercises: { ...f.exercises, [ex.id]: e.target.value } }))}
              style={{ width: "100%", background: "none", border: "none", color: "#e2e8f0", fontSize: 16, fontFamily: "inherit", outline: "none", padding: 0 }} />
            <div style={{ fontSize: 8, color: "#334155" }}>{ex.unit}</div>
          </div>
        ))}
      </div>
      <textarea value={form.sessionNotes || ""}
        onChange={e => setForm(f => ({ ...f, sessionNotes: e.target.value }))}
        placeholder="Notes..."
        style={{ width: "100%", background: "#12151e", border: "none", borderRadius: 4, padding: "8px 10px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit", resize: "none", minHeight: 48, boxSizing: "border-box", marginBottom: 8, outline: "none" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSave} disabled={saving} style={{ ...S.btn("primary"), flex: 1, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel} style={S.btn("ghost")}>Cancel</button>
      </div>
    </div>
  );
}
