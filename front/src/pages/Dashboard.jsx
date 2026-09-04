// src/pages/Dashboard.jsx — Overview Only (Career Intelligence Command Center)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const PIPELINE_STEPS = [
  { icon: "🧠", label: "Profile Intelligence", desc: "Resume + Skill Graph", path: "/profile", color: "#f59e0b" },
  { icon: "🎯", label: "Tech Job Match",        desc: "Top 10 matched jobs",  path: "/jobs",    color: "#f59e0b" },
  { icon: "📊", label: "Skill Gap & Tests",     desc: "Identify & close gaps", path: "/skills", color: "#34d399" },
  { icon: "🗺️", label: "Roadmap",              desc: "Adaptive learning path", path: "/roadmap", color: "#fb923c" },
  { icon: "🤖", label: "AI Assistant",          desc: "Career mentor chat",   path: "/chat",    color: "#f472b6" },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = sessionStorage.getItem("dashboardStats");
      if (cached) {
        const parsed = JSON.parse(cached);
        // If cached data has no test score, clear and re-fetch — user may have taken a test
        if (parsed.latestTestScore === null) {
          sessionStorage.removeItem("dashboardStats");
        } else {
          setStats(parsed);
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);
    const [profileRes, topJobRes, roadmapRes] = await Promise.allSettled([
      fetch("/api/user/check-login", { credentials: "include" }).then(r => r.json()),
      fetch("/api/jobs/recommendations?top_k=1", { credentials: "include" }).then(r => r.json()),
      fetch("/api/roadmap/me", { credentials: "include" }).then(r => r.json()),
    ]);

    const profile = profileRes.status === "fulfilled" ? profileRes.value : null;
    const jobData = topJobRes.status === "fulfilled" ? topJobRes.value : null;
    const roadmap = roadmapRes.status === "fulfilled" ? roadmapRes.value : null;

    // Get latest test result
    let latestTest = null;
    try {
      const testRes = await fetch("/api/test/latest", { credentials: "include" });
      if (testRes.ok) {
        const td = await testRes.json();
        latestTest = td.result;
      }
    } catch (_) {}

    const newStats = {
      user: profile?.user,
      hasResume: !!profile?.user?.resume_url,
      readinessScore: profile?.user?.readiness_score || 0,
      topJob: jobData?.data?.recommendations?.[0] || null,
      topJobScore: jobData?.data?.recommendations?.[0]?.matchScore || 0,
      latestTestScore: latestTest?.score || null,
      latestTestDomain: latestTest?.domain || null,
      roadmapGoal: roadmap?.roadmap?.goal || null,
      roadmapPhases: roadmap?.roadmap?.phases?.length || 0,
    };
    
    setStats(newStats);
    sessionStorage.setItem("dashboardStats", JSON.stringify(newStats));
    setLoading(false);
  };

  const readiness = stats?.readinessScore || 0;
  const readinessColor = readiness >= 70 ? "#f97316" : readiness >= 40 ? "#f59e0b" : "#ef4444";
  const readinessLabel = readiness >= 70 ? "Job Ready 🚀" : readiness >= 40 ? "Improving 📈" : "Build Skills 🔧";

  if (loading) return (
    <div style={layout.page}>
      <Sidebar />
      <main style={layout.main}>
        <div style={styles.loadingCenter}>
          <div style={styles.loadingSpinner}>⚡</div>
          <p style={{ color: "#6b7280", marginTop: 12 }}>Loading your career intelligence...</p>
        </div>
      </main>
    </div>
  );

  return (
    <div style={layout.page}>
      <Sidebar />
      <main style={layout.main}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>
              Welcome back, {stats?.user?.fullName?.split(" ")[0] || "Developer"} 👋
            </h1>
            <p style={styles.subtitle}>Career Intelligence Operating System — Your career loop is active</p>
          </div>
          {!stats?.hasResume && (
            <button onClick={() => navigate("/profile")} style={styles.ctaPrimary}>
              🧠 Set Up Profile →
            </button>
          )}
        </div>

        {/* 4 Summary Metric Cards */}
        <div style={styles.metricsGrid}>
          {/* Career Readiness */}
          <div style={{ ...styles.metricCard, border: `1px solid ${readinessColor}30` }}>
            <div style={styles.metricLabel}>Career Readiness Score</div>
            <div style={styles.metricRow}>
              <svg width={72} height={72} viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#ffffff" strokeWidth="8" />
                <circle
                  cx="36" cy="36" r="30"
                  fill="none"
                  stroke={readinessColor}
                  strokeWidth="8"
                  strokeDasharray={`${(readiness / 100) * 188.5} 188.5`}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="41" textAnchor="middle" fill="#111827" fontSize="16" fontWeight="bold">{readiness}</text>
              </svg>
              <div>
                <div style={{ fontSize: 13, color: readinessColor, fontWeight: 700 }}>{readinessLabel}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>out of 100</div>
                <button onClick={() => navigate("/profile")} style={styles.miniBtn}>View Profile →</button>
              </div>
            </div>
          </div>

          {/* Latest Test Result */}
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Latest Test Result</div>
            {stats?.latestTestScore !== null ? (
              <div style={styles.metricRow}>
                <div style={{ fontSize: 42, fontWeight: 800, color: stats.latestTestScore >= 70 ? "#f97316" : "#f59e0b" }}>
                  {stats.latestTestScore}%
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#4b5563" }}>{stats.latestTestDomain || "General"}</div>
                  <button onClick={() => navigate("/skills")} style={styles.miniBtn}>Retake →</button>
                </div>
              </div>
            ) : (
              <div style={styles.emptyMetric}>
                <span style={{ fontSize: 28 }}>📝</span>
                <div style={{ fontSize: 13, color: "#6b7280", margin: "8px 0" }}>No tests taken yet</div>
                <button onClick={() => navigate("/skills")} style={styles.miniBtn}>Take Test →</button>
              </div>
            )}
          </div>

          {/* Top Job Match */}
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Top Job Match</div>
            {stats?.topJob ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                  {stats.topJob.title}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                  {stats.topJob.company}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...styles.matchBadge, background: "#f9731620", color: "#f97316", border: "1px solid #f9731640" }}>
                    {(() => { const s = stats.topJobScore || 0; return (s <= 1 ? Math.round(s * 100) : Math.round(s)) + "% match"; })()}
                  </span>
                </div>
                <button onClick={() => navigate("/jobs")} style={{ ...styles.miniBtn, marginTop: 8 }}>See All Jobs →</button>
              </div>
            ) : (
              <div style={styles.emptyMetric}>
                <span style={{ fontSize: 28 }}>🎯</span>
                <div style={{ fontSize: 13, color: "#6b7280", margin: "8px 0" }}>Upload resume first</div>
                <button onClick={() => navigate("/jobs")} style={styles.miniBtn}>Find Jobs →</button>
              </div>
            )}
          </div>

          {/* Next Roadmap Step */}
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Next Roadmap Step</div>
            {stats?.roadmapGoal ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                  {stats.roadmapGoal}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {stats.roadmapPhases} phases planned
                </div>
                <button onClick={() => navigate("/roadmap")} style={{ ...styles.miniBtn, marginTop: 8 }}>View Roadmap →</button>
              </div>
            ) : (
              <div style={styles.emptyMetric}>
                <span style={{ fontSize: 28 }}>🗺️</span>
                <div style={{ fontSize: 13, color: "#6b7280", margin: "8px 0" }}>No roadmap yet</div>
                <button onClick={() => navigate("/roadmap")} style={styles.miniBtn}>Generate →</button>
              </div>
            )}
          </div>
        </div>

        {/* Career Pipeline */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🔄 Career Intelligence Pipeline</h2>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
            Click any module to jump directly into that stage of your career loop.
          </p>
          <div style={styles.pipelineGrid}>
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.path}>
                <button
                  onClick={() => navigate(step.path)}
                  style={{ ...styles.pipelineCard, borderColor: step.color + "40" }}
                >
                  <div style={{ ...styles.pipelineIcon, background: step.color + "20", color: step.color }}>
                    {step.icon}
                  </div>
                  <div style={styles.pipelineLabel}>{step.label}</div>
                  <div style={styles.pipelineDesc}>{step.desc}</div>
                  <div style={{ ...styles.pipelineArrow, color: step.color }}>→</div>
                </button>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={styles.pipelineConnector}>▶</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        {!stats?.hasResume && (
          <div style={styles.alertCard}>
            <span style={{ fontSize: 24 }}>🚀</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                Start your career intelligence journey
              </div>
              <div style={{ color: "#4b5563", fontSize: 13 }}>
                Upload your resume to activate AI-powered job matching, skill gap detection, and personalized roadmap.
              </div>
            </div>
            <button onClick={() => navigate("/profile")} style={styles.ctaPrimary}>
              Upload Resume →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────
const layout = {
  page: { display: "flex", minHeight: "100vh", background: "#f5f6f8" },
  main: {
    flex: 1,
    marginLeft: 240,
    padding: "36px 40px",
    maxWidth: "calc(100vw - 240px)",
    overflowY: "auto",
    transition: "margin-left 0.25s ease",
  },
};

// ─── Styles ────────────────────────────────────────────────────────────
const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 16 },
  h1: { margin: 0, fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "#111827", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#6b7280", fontSize: 14 },
  ctaPrimary: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #f59e0b, #f59e0b)",
    border: "none", borderRadius: 10, color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer",
    boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
  },
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 36 },
  metricCard: {
    background: "#ffffff",
    borderRadius: 16, padding: "20px",
    border: "1px solid rgba(17,24,39,0.06)",
  },
  metricLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 },
  metricRow: { display: "flex", alignItems: "center", gap: 14 },
  emptyMetric: { textAlign: "center", padding: "10px 0" },
  miniBtn: {
    marginTop: 8, padding: "5px 12px",
    background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
    borderRadius: 6, color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 600,
  },
  matchBadge: { padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  section: { marginBottom: 36 },
  sectionTitle: { color: "#111827", fontSize: 20, fontWeight: 700, marginBottom: 8 },
  pipelineGrid: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pipelineCard: {
    flex: "1 1 140px", minWidth: 130, maxWidth: 175,
    padding: "20px 16px", background: "#ffffff",
    border: "1px solid transparent", borderRadius: 14,
    cursor: "pointer", textAlign: "center",
    transition: "all 0.2s",
  },
  pipelineIcon: { width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 10px" },
  pipelineLabel: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 },
  pipelineDesc: { fontSize: 11, color: "#6b7280", marginBottom: 8 },
  pipelineArrow: { fontSize: 16, fontWeight: 700 },
  pipelineConnector: { fontSize: 14, color: "#e2e6ee", flexShrink: 0 },
  alertCard: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "20px 24px", background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.08))",
    border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, flexWrap: "wrap",
  },
  loadingCenter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh" },
  loadingSpinner: { fontSize: 48 },
};
