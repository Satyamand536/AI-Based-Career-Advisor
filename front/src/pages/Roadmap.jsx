// src/pages/Roadmap.jsx - v2: Connected Workflow (auto-loads saved roadmap, uses real profile)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState(0); // First phase open by default
  const navigate = useNavigate();

  // Auto-load saved roadmap on mount (workflow chain)
  useEffect(() => {
    loadSavedRoadmap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedRoadmap = async () => {
    // Use session cache if available
    const cached = sessionStorage.getItem("roadmapData");
    if (cached) {
      try {
        setRoadmap(JSON.parse(cached));
        setLoading(false);
        return;
      } catch (_) { sessionStorage.removeItem("roadmapData"); }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/roadmap/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.roadmap) {
          setRoadmap(data.roadmap);
          sessionStorage.setItem("roadmapData", JSON.stringify(data.roadmap));
        }
      }
      // If 404, no roadmap yet — user can generate one
    } catch (err) {
      console.error("[Roadmap] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async () => {
    setGenerating(true);
    const toastId = toast.loading("🤖 Analyzing your profile and building personalized roadmap...");
    try {
      const genRes = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // No explicit goal → backend auto-detects from resume + skill gaps
          hours_per_week: 10
        }),
        credentials: "include"
      });

      const data = await genRes.json();
      if (data.ok && data.roadmap) {
        setRoadmap(data.roadmap);
        setExpandedPhase(0);
        sessionStorage.setItem("roadmapData", JSON.stringify(data.roadmap)); // Cache new roadmap
        toast.success("🗺️ Your personalized roadmap is ready!", { id: toastId });
      } else {
        toast.error(data.error || "Failed to generate roadmap", { id: toastId });
      }
    } catch (err) {
      console.error("[Roadmap] Generate error:", err);
      toast.error("Connection error. Please check AI service is running.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const phaseColors = ["#52c41a", "#22d3a5", "#722ed1", "#fa8c16", "#eb2f96"];

  if (loading) {
    return (
      <div style={layout.page}>
        <Sidebar />
        <main style={layout.main}>
          <div style={styles.loadingBox}>
            <div style={styles.spinner}>⚙️</div>
            <p style={{ color: "#b6c2d6", marginTop: 12 }}>Loading your roadmap...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={layout.page}>
      <Sidebar />
      <main style={layout.main}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>🗺️ My Learning Roadmap</h1>
            <p style={styles.subtitle}>
              {roadmap
                ? "Your AI-personalized career learning path based on your resume + skill gaps"
                : "Generate your personalized path to get job-ready"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {roadmap && (
              <button onClick={() => navigate("/test")} style={styles.secondaryBtn}>
                📝 Take Test → Update Gaps
              </button>
            )}
            <button
              onClick={generateRoadmap}
              disabled={generating}
              style={styles.primaryBtn}
            >
              {generating ? "🤖 Generating..." : roadmap ? "🔄 Regenerate" : "✨ Generate My Roadmap"}
            </button>
          </div>
        </div>

        {/* Workflow Progress Bar */}
        <div style={styles.workflowBar}>
          <WorkflowStep icon="📄" label="Resume" done={true} />
          <div style={styles.workflowLine} />
          <WorkflowStep icon="🎯" label="Job Match" done={true} />
          <div style={styles.workflowLine} />
          <WorkflowStep icon="📝" label="Skill Test" done={false} onClick={() => navigate("/test")} />
          <div style={styles.workflowLine} />
          <WorkflowStep icon="🗺️" label="Roadmap" done={!!roadmap} active={true} />
          <div style={styles.workflowLine} />
          <WorkflowStep icon="🤖" label="AI Mentor" done={false} onClick={() => navigate("/chat")} />
        </div>

        {roadmap ? (
          <div>
            {/* Roadmap Hero Card */}
            <div style={styles.heroCard}>
              <div style={styles.heroOverlay}>CTO</div>
              <h2 style={{ margin: "0 0 8px 0", fontSize: 26 }}>🎯 {roadmap.goal || "Career Mastery Path"}</h2>
              <p style={{ margin: "0 0 8px 0", opacity: 0.9, fontSize: 15 }}>{roadmap.timeline}</p>
              {roadmap.summary && (
                <p style={{ margin: 0, opacity: 0.75, fontSize: 13, fontStyle: "italic", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 10, marginTop: 10 }}>
                  {roadmap.summary}
                </p>
              )}
            </div>

            {/* Phases */}
            <div style={{ display: "grid", gap: 24 }}>
              {(roadmap.phases || []).map((phase, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.phaseCard,
                    borderLeftColor: phaseColors[i % phaseColors.length]
                  }}
                >
                  {/* Phase Header */}
                  <div
                    style={styles.phaseHeader}
                    onClick={() => setExpandedPhase(expandedPhase === i ? -1 : i)}
                  >
                    <div>
                      <span style={{ ...styles.levelBadge, color: phaseColors[i % phaseColors.length] }}>
                        PHASE {phase.level || i + 1}
                      </span>
                      <h2 style={{ margin: "5px 0 0", fontSize: 22, color: "#eef2f8" }}>{phase.name}</h2>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={styles.durationBadge}>{phase.duration || "Self-paced"}</span>
                      <span style={{ fontSize: 20, color: "#b6c2d6" }}>
                        {expandedPhase === i ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Weeks (collapsible) */}
                  {expandedPhase === i && (
                    <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
                      {(phase.weeks || []).map((week, w) => (
                        <div key={w} style={styles.weekCard}>
                          <div style={styles.weekHeader}>
                            <span style={styles.weekNum}>{week.week_number || week.week || w + 1}</span>
                            <h4 style={{ margin: 0, fontSize: 17, color: "#eef2f8" }}>{week.topic}</h4>
                          </div>

                          {week.why_it_matters && (
                            <div style={styles.whyBox}>
                              <strong>🎯 Why it matters:</strong> {week.why_it_matters}
                            </div>
                          )}

                          <div style={{ marginBottom: 12 }}>
                            <div style={styles.sectionLabel}>Daily Execution</div>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                              {(week.daily_tasks || week.tasks || []).map((task, t) => (
                                <li key={t} style={{ marginBottom: 5, color: "#d7e0ec", fontSize: 14 }}>{task}</li>
                              ))}
                            </ul>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {week.practical_task && (
                              <div style={styles.practicalBox}>
                                <div style={styles.practicalLabel}>🛠️ PRACTICAL TASK</div>
                                <div style={{ fontSize: 13, color: "#a3e635" }}>{week.practical_task}</div>
                              </div>
                            )}
                            {week.interview_question && (
                              <div style={styles.interviewBox}>
                                <div style={styles.interviewLabel}>🎤 INTERVIEW Q</div>
                                <div style={{ fontSize: 13, fontStyle: "italic", color: "#5eead4" }}>"{week.interview_question}"</div>
                              </div>
                            )}
                          </div>

                          {week.resources && week.resources.length > 0 && (
                            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {week.resources.map((res, r) => (
                                <a
                                  key={r}
                                  href={res.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={styles.resourceLink}
                                >
                                  🔗 {res.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Milestone Project */}
            {roadmap.milestone_project && (
              <div style={styles.milestoneCard}>
                <div style={styles.milestoneLabel}>🏆 MILESTONE PROJECT</div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 20, color: "#eef2f8" }}>{roadmap.milestone_project.title}</h3>
                <p style={{ margin: "0 0 12px 0", color: "#b6c2d6", fontSize: 14 }}>
                  {roadmap.milestone_project.description}
                </p>
                {roadmap.milestone_project.tech_stack && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {roadmap.milestone_project.tech_stack.map((tech, ti) => (
                      <span key={ti} style={styles.techBadge}>{tech}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next Steps CTA */}
            <div style={styles.ctaRow}>
              <button onClick={() => navigate("/chat")} style={styles.ctaBtn}>
                🤖 Discuss with AI Career Mentor
              </button>
              <button onClick={() => navigate("/test")} style={{ ...styles.ctaBtn, background: "linear-gradient(135deg, #52c41a, #389e0d)" }}>
                📝 Take Skill Test to Update Gaps
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 60, marginBottom: 20 }}>🗺️</div>
            <h3 style={{ fontSize: 24, marginBottom: 12 }}>No Active Roadmap</h3>
            <p style={{ color: "#b6c2d6", fontSize: 15, maxWidth: 500, margin: "0 auto 30px" }}>
              Your personalized career progression path is generated using proprietary AI analysis of your skills and test results.
              Upload a resume and take assessments to build your profile.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/dashboard")} style={styles.secondaryBtn}>
                📄 Upload Resume First
              </button>
              <button onClick={generateRoadmap} disabled={generating} style={styles.primaryBtn}>
                {generating ? "🤖 Generating..." : "✨ Generate My Roadmap"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const layout = {
  page: { display: "flex", minHeight: "100vh", background: "#070a12" },
  main: { flex: 1, marginLeft: 240, padding: "36px 40px", overflowY: "auto" },
};

function WorkflowStep({ icon, label, done, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        cursor: onClick ? "pointer" : "default",
        opacity: done || active ? 1 : 0.45,
        transition: "all 0.2s"
      }}
    >
      <div style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: done ? "#10b981" : active ? "#22d3a5" : "#101728",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: active ? "0 0 0 4px rgba(34,211,165,0.2)" : done ? "0 0 0 4px rgba(16,185,129,0.2)" : "none"
      }}>
        {done ? "✅" : icon}
      </div>
      <span style={{ fontSize: 11, color: active ? "#5eead4" : done ? "#34d399" : "#9aa7c2", fontWeight: active || done ? "bold" : "normal" }}>
        {label}
      </span>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30, flexWrap: "wrap", gap: 16 },
  title: { margin: 0, fontSize: "clamp(1.6rem, 3vw, 2rem)", color: "#eef2f8" },
  subtitle: { margin: "6px 0 0", color: "#b6c2d6", fontSize: 14 },
  primaryBtn: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #22d3a5 0%, #10b981 100%)",
    color: "#fff", border: "none", borderRadius: 8,
    cursor: "pointer", fontWeight: "bold", fontSize: 14,
    boxShadow: "0 4px 12px rgba(16,185,129,0.25)", transition: "all 0.2s"
  },
  secondaryBtn: {
    padding: "12px 24px", background: "rgba(30,30,30,0.5)",
    color: "#e8edf5", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14,
    transition: "all 0.2s", backdropFilter: "blur(10px)"
  },
  workflowBar: {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "20px 30px", background: "#101728",
    borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    marginBottom: 32, gap: 8, flexWrap: "wrap"
  },
  workflowLine: { flex: 1, height: 2, background: "rgba(255,255,255,0.1)", maxWidth: 60 },
  heroCard: {
    background: "linear-gradient(135deg, #1f2a44 0%, #241d3f 100%)",
    padding: "30px 28px", borderRadius: 16, marginBottom: 30,
    color: "#fff", position: "relative", overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)"
  },
  heroOverlay: {
    position: "absolute", top: -20, right: -10,
    fontSize: 120, opacity: 0.06, fontWeight: "bold", pointerEvents: "none"
  },
  phaseCard: {
    background: "#101728", padding: 24, borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.05)", borderLeft: "8px solid #22d3a5",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)", transition: "all 0.3s"
  },
  phaseHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  levelBadge: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" },
  durationBadge: { padding: "4px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 20, fontSize: 13, color: "#b6c2d6" },
  weekCard: {
    padding: 18, background: "#070a12",
    borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)"
  },
  weekHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  weekNum: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#22d3a5", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: "bold", flexShrink: 0,
    boxShadow: "0 0 10px rgba(34,211,165,0.3)"
  },
  whyBox: {
    marginBottom: 12, padding: "8px 12px",
    background: "rgba(139, 92, 246, 0.1)", borderLeft: "3px solid #8b5cf6",
    borderRadius: 4, fontSize: 13, color: "#e8edf5"
  },
  sectionLabel: { fontSize: 12, fontWeight: "bold", color: "#9aa7c2", marginBottom: 8, textTransform: "uppercase" },
  practicalBox: { padding: 12, background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: 8 },
  practicalLabel: { fontSize: 11, fontWeight: "bold", color: "#4ade80", marginBottom: 4 },
  interviewBox: { padding: 12, background: "rgba(34, 211, 165, 0.1)", border: "1px solid rgba(34, 211, 165, 0.2)", borderRadius: 8 },
  interviewLabel: { fontSize: 11, fontWeight: "bold", color: "#5eead4", marginBottom: 4 },
  resourceLink: {
    fontSize: 12, color: "#e8edf5", textDecoration: "none",
    padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, transition: "all 0.2s"
  },
  milestoneCard: {
    marginTop: 30, padding: 24,
    background: "linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.1) 100%)",
    borderRadius: 16, border: "1px solid rgba(234, 179, 8, 0.2)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
  },
  milestoneLabel: { fontSize: 12, fontWeight: "bold", color: "#facc15", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 },
  techBadge: {
    padding: "4px 12px", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(234, 179, 8, 0.3)", borderRadius: 6,
    fontSize: 12, color: "#facc15", fontWeight: "bold"
  },
  ctaRow: { marginTop: 30, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  ctaBtn: {
    padding: "14px 28px",
    background: "linear-gradient(135deg, #22d3a5 0%, #10b981 100%)",
    color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer", fontWeight: "bold", fontSize: 15,
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)", transition: "all 0.2s"
  },
  emptyCard: {
    padding: 60, background: "#101728", borderRadius: 16,
    textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
  },
  loadingBox: { padding: 80, textAlign: "center" },
  spinner: { fontSize: 48, animation: "spin 2s linear infinite", display: "inline-block" }
};
