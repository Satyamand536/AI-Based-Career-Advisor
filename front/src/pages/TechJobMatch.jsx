// src/pages/TechJobMatch.jsx — Top 10 Tech Jobs with Real Match%, Matched+Missing Skills
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar, { MobileNav } from "../components/Sidebar";
import { checkLogin, getCachedSession } from "../auth";

const PROGRESS_STEPS = [
  "🔍 Loading your skill profile...",
  "🧮 Generating MPNet embeddings...",
  "📐 Computing cosine similarity...",
  "🏆 Applying hybrid ranking...",
  "✅ Top 10 jobs ranked!",
];

// Job descriptions from live APIs contain HTML; strip tags for clean display.
const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export default function TechJobMatch() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [profileSkills, setProfileSkills] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [profileSummary, setProfileSummary] = useState(null);
  const [filter, setFilter] = useState("all"); // all / high / medium
  const navigate = useNavigate();

  useEffect(() => {
    checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkProfile = async () => {
    const auth = await checkLogin();
    // Transient backend error: keep the cached session instead of logging out.
    if (auth.transient) {
      const cached = getCachedSession();
      if (cached?.resume_url) {
        setHasResume(true);
        loadJobs();
      }
      return;
    }
    if (!auth.loggedIn) { navigate("/"); return; }

    if (auth.user?.resume_url) {
      setHasResume(true);
      // Get saved skills for skill comparison
      try {
        const sr = await fetch("/api/resume/skills", { credentials: "include" });
        if (sr.ok) {
          const sd = await sr.json();
          if (sd.ok && sd.skills) setProfileSkills(sd.skills.map(s => s.toLowerCase()));
        }
      } catch (_) {}
      loadJobs();
    }
  };

  const loadJobs = useCallback(async (forceRefresh = false) => { // Renamed from fetchJobs, added param
    // Return cached jobs if available and not forced
    if (!forceRefresh) {
      const cached = sessionStorage.getItem("techJobsData");
      if (cached) {
        setJobs(JSON.parse(cached));
        setLoading(false);
        setCurrentStep(-1); // Ensure progress is reset
        return;
      }
    }

    setLoading(true);
    setCurrentStep(0);

    // Animate progress steps
    for (let i = 0; i < PROGRESS_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(i + 1);
    }

    try {
      const res = await fetch("/api/jobs/recommendations?top_k=10", { credentials: "include" });
      const data = await res.json();

      if (data.ok && data.data?.recommendations) {
        const recs = data.data.recommendations;
        const sorted = recs.sort((a, b) => getMatchPct(b) - getMatchPct(a)); // Sort by match percentage
        setJobs(sorted);
        sessionStorage.setItem("techJobsData", JSON.stringify(sorted)); // Cache data

        setCurrentStep(PROGRESS_STEPS.length); // Mark all steps as complete
        setProfileSummary(data.data.profileSummary);
        if (recs.length === 0) {
          toast("No matching tech jobs found. Check back after next job data refresh.", { icon: "ℹ️" });
        } else {
          toast.success(`🎯 Found ${recs.length} matched tech jobs!`);
        }
      } else {
        toast.error(data.message || "Failed to load job recommendations");
      }
    } catch (err) {
      toast.error("AI service error. Make sure Python service is running.");
    } finally {
      setLoading(false);
      setCurrentStep(-1);
    }
  }, []);

  // Get match score as integer percentage
  const getMatchPct = (job) => {
    const raw = job.matchScore ?? job.final_score ?? job.explanation?.score ?? 0;
    return Math.round(raw <= 1 ? raw * 100 : raw);
  };

  const getMatchColor = (pct) => {
    if (pct >= 80) return "#f97316";
    if (pct >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getMatchLabel = (pct) => {
    if (pct >= 80) return "Excellent Match";
    if (pct >= 60) return "Good Match";
    if (pct >= 40) return "Partial Match";
    return "Low Match";
  };

  const getMatchedSkills = (job) => {
    // Prefer explicit matched_skills array; fallback to explanation.skills.matched
    return job.matched_skills
      || job.explanation?.skills?.matched
      || job.explanation?.matched_skills
      || [];
  };

  const getMissingSkills = (job) => {
    return job.missing_skills
      || job.explanation?.skills?.missing
      || job.explanation?.missing_skills
      || [];
  };

  const filteredJobs = jobs.filter(job => {
    const pct = getMatchPct(job);
    if (filter === "high") return pct >= 70;
    if (filter === "medium") return pct >= 40 && pct < 70;
    return true;
  });

  return (
    <div style={layout.page}>
      <Sidebar />
      <MobileNav />
      <main style={layout.main}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>🎯 Tech Job Match</h1>
            <p style={styles.subtitle}>
              Top 10 tech jobs ranked by: 60% embedding similarity · 20% skill overlap · 10% experience · 10% behavior
            </p>
          </div>
          <button onClick={() => loadJobs(true)} disabled={loading || !hasResume} style={styles.refreshBtn}>
            {loading ? "🔄 Matching..." : "🔄 Refresh Matches"}
          </button>
        </div>

        {/* Hybrid ranking formula badge */}
        <div style={styles.formulaBadge}>
          <span style={styles.formulaLabel}>RANKING FORMULA</span>
          {["0.6 × Embedding Similarity", "0.2 × Skill Overlap", "0.1 × Experience", "0.1 × User Behavior"].map((f, i, arr) => (
            <React.Fragment key={i}>
              <span style={{ color: "#4b5563", fontSize: 13 }}>{f}</span>
              {i < arr.length - 1 && <span style={{ color: "#e2e6ee", fontWeight: 700 }}>+</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={styles.loadingCard}>
            <h3 style={{ color: "#111827", marginBottom: 20 }}>🤖 AI Matching Engine Running...</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PROGRESS_STEPS.map((step, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: i <= currentStep ? 1 : 0.3,
                  transition: "opacity 0.4s ease",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: i < currentStep ? "#f97316" : i === currentStep ? "#f59e0b" : "#e2e6ee",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                  }}>
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 14, color: i <= currentStep ? "#111827" : "#475569" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Summary */}
        {profileSummary && !loading && (
          <div style={styles.profileBanner}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>{profileSummary.headline || "Tech Profile Analyzed"}</div>
            <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{profileSummary.reason || profileSummary.description}</div>
          </div>
        )}

        {/* Filter tabs */}
        {jobs.length > 0 && !loading && (
          <div style={styles.filterRow}>
            {[["all", `All (${jobs.length})`], ["high", "Excellent 80%+"], ["medium", "Good 60-80%"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{ ...styles.filterBtn, ...(filter === val ? styles.filterBtnActive : {}) }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Job Cards Grid */}
        {!loading && filteredJobs.length > 0 && (
          <div className="ca-jobs-grid" style={styles.jobsGrid}>
            {filteredJobs.map((job, idx) => {
              const matchPct = getMatchPct(job);
              const matchColor = getMatchColor(matchPct);
              const matchedSkills = getMatchedSkills(job);
              const missingSkills = getMissingSkills(job);
              const isExpanded = selectedJob === idx;

              return (
                <div key={idx} style={{ ...styles.jobCard, borderColor: isExpanded ? "#f59e0b" : "rgba(17,24,39,0.06)" }}>
                  {/* Rank badge */}
                  <div style={styles.rankBadge}>#{idx + 1}</div>

                  {/* Match score */}
                  <div style={styles.matchHeader}>
                    <div style={{ flex: 1 }}>
                      <h3 style={styles.jobTitle}>{job.title}</h3>
                      <div style={styles.jobMeta}>
                        <span>{job.company}</span>
                        {job.location && <><span style={{ color: "#e2e6ee" }}>·</span><span>{job.location}</span></>}
                        {job.type && <><span style={{ color: "#e2e6ee" }}>·</span><span>{job.type}</span></>}
                      </div>
                    </div>
                    {/* Match Score Circle */}
                    <div style={{ textAlign: "center" }}>
                      <svg width={64} height={64} viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff" strokeWidth="6" />
                        <circle
                          cx="32" cy="32" r="26"
                          fill="none"
                          stroke={matchColor}
                          strokeWidth="6"
                          strokeDasharray={`${(matchPct / 100) * 163.4} 163.4`}
                          strokeLinecap="round"
                          transform="rotate(-90 32 32)"
                        />
                        <text x="32" y="37" textAnchor="middle" fill={matchColor} fontSize="14" fontWeight="bold">{matchPct}%</text>
                      </svg>
                      <div style={{ fontSize: 10, color: matchColor, fontWeight: 700, textAlign: "center" }}>
                        {getMatchLabel(matchPct)}
                      </div>
                    </div>
                  </div>

                  {/* ─── MATCHED SKILLS (Always shown) ─── */}
                  <div style={styles.skillsSection}>
                    <div style={styles.skillsSectionLabel}>
                      <span style={{ color: "#f97316" }}>✓</span> Matched Skills
                    </div>
                    <div style={styles.skillsRow}>
                      {matchedSkills.length > 0 ? (
                        matchedSkills.slice(0, 8).map((skill, si) => (
                          <span key={si} style={styles.matchedChip}>{skill}</span>
                        ))
                      ) : (
                        // Fallback: compare requiredSkills with profileSkills
                        (job.requiredSkills || job.skills || [])
                          .filter(s => profileSkills.includes(s.toLowerCase()))
                          .slice(0, 8)
                          .map((skill, si) => <span key={si} style={styles.matchedChip}>{skill}</span>)
                      )}
                      {matchedSkills.length === 0 && profileSkills.length === 0 && (
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Upload resume for skill matching</span>
                      )}
                    </div>
                  </div>

                  {/* ─── MISSING SKILLS (Always shown) ─── */}
                  {missingSkills.length > 0 && (
                    <div style={styles.skillsSection}>
                      <div style={styles.skillsSectionLabel}>
                        <span style={{ color: "#ef4444" }}>✗</span> Missing Skills
                      </div>
                      <div style={styles.skillsRow}>
                        {missingSkills.slice(0, 6).map((skill, si) => (
                          <span key={si} style={styles.missingChip}>{skill}</span>
                        ))}
                        {missingSkills.length > 6 && (
                          <span style={{ ...styles.missingChip, opacity: 0.6 }}>+{missingSkills.length - 6}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expand for details */}
                  {isExpanded && (
                    <div style={styles.expandedDetails}>
                      {job.description && (
                        <p style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.7 }}>
                          {stripHtml(job.description).slice(0, 300)}{stripHtml(job.description).length > 300 ? "..." : ""}
                        </p>
                      )}
                      {/* Job Meta Details Grid */}
                      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {/* Salary */}
                        <div style={styles.detailBox}>
                          <div style={styles.detailLabel}>💰 Salary Estimated</div>
                          <div style={styles.detailValue}>
                            {job.salary_min && job.salary_max 
                              ? `$${Math.round(job.salary_min).toLocaleString()} - $${Math.round(job.salary_max).toLocaleString()} / yr` 
                              : "Not disclosed"}
                          </div>
                        </div>
                        {/* Location */}
                        <div style={styles.detailBox}>
                          <div style={styles.detailLabel}>📍 Location</div>
                          <div style={styles.detailValue}>
                            {job.location?.display_name || "Remote / Anywhere"}
                          </div>
                        </div>
                        {/* Job Type */}
                        <div style={styles.detailBox}>
                          <div style={styles.detailLabel}>🏢 Job Type</div>
                          <div style={styles.detailValue}>
                            {job.contract_time ? job.contract_time.replace("_", " ") : "Full-time"}
                            {(job.description?.toLowerCase().includes("remote") || job.location?.display_name?.toLowerCase().includes("remote")) ? " • Remote" : " • On-site/Hybrid"}
                          </div>
                        </div>
                        {/* Experience Needed */}
                        <div style={styles.detailBox}>
                          <div style={styles.detailLabel}>⏳ Experience Needed</div>
                          <div style={styles.detailValue}>
                            {job.description?.match(/(\d+)(?:\s*-\s*\d+)?\s*\+?\s*years?/i) ? job.description.match(/(\d+)(?:\s*-\s*\d+)?\s*\+?\s*years?/i)[0] : "Based on skills"}
                          </div>
                        </div>
                      </div>

                      {/* Required Skills (Missing) */}
                      {job.explanation?.skills_missing && job.explanation.skills_missing.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={styles.skillsSectionLabel}>Required Skills (To Learn)</div>
                          <div style={styles.skillsRow}>
                            {job.explanation.skills_missing.map((sk, i) => (
                              <span key={i} style={styles.missingChip}>{sk}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={styles.cardActions}>
                    <button
                      onClick={() => setSelectedJob(isExpanded ? null : idx)}
                      style={styles.detailsBtn}
                    >
                      {isExpanded ? "▲ Less" : "▼ Details"}
                    </button>
                    {missingSkills.length > 0 && (
                      <button onClick={() => navigate("/skills")} style={styles.learnBtn}>
                        🔧 Close Gaps
                      </button>
                    )}
                    {(job.applyUrl || job.apply_url || job.source_link || job.jobUrl) ? (
                      <a
                        href={job.applyUrl || job.apply_url || job.source_link || job.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.applyBtn}
                      >
                        🚀 Apply Now
                      </a>
                    ) : (
                      <button style={{ ...styles.applyBtn, opacity: 0.5, cursor: "not-allowed" }} disabled>
                        🚀 Apply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No resume state */}
        {!hasResume && !loading && (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h3 style={{ color: "#111827", marginBottom: 8 }}>No profile found</h3>
            <p style={{ color: "#6b7280", maxWidth: 400 }}>
              Upload your resume in Profile Intelligence to activate AI-powered job matching with real match scores.
            </p>
            <button onClick={() => navigate("/profile")} style={{ ...styles.refreshBtn, marginTop: 20 }}>
              🧠 Go to Profile Intelligence
            </button>
          </div>
        )}

        {/* No jobs found */}
        {hasResume && !loading && jobs.length === 0 && (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h3 style={{ color: "#111827", marginBottom: 8 }}>No tech jobs in database yet</h3>
            <p style={{ color: "#6b7280", maxWidth: 400 }}>
              The job fetcher CRON service will populate jobs. You can also manually trigger the ingestion.
            </p>
            <button onClick={() => loadJobs(true)} style={{ ...styles.refreshBtn, marginTop: 20 }}>
              🔄 Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const layout = {
  page: { display: "flex", minHeight: "100vh", background: "#f5f6f8" },
  main: { flex: 1, marginLeft: 240, padding: "36px 40px", overflowY: "auto" },
};

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 },
  h1: { margin: 0, fontSize: 28, color: "#111827", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#6b7280", fontSize: 13 },
  refreshBtn: {
    padding: "11px 22px", background: "linear-gradient(135deg, #f59e0b, #f59e0b)",
    border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
    opacity: 1, flexShrink: 0,
  },
  formulaBadge: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    padding: "12px 18px", background: "#ffffff",
    borderRadius: 10, marginBottom: 24, border: "1px solid #e2e6ee",
  },
  formulaLabel: { fontSize: 10, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "1px", marginRight: 8 },
  loadingCard: { background: "#ffffff", borderRadius: 16, padding: "32px", marginBottom: 24, border: "1px solid rgba(245,158,11,0.2)" },
  profileBanner: { padding: "14px 18px", background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", marginBottom: 20 },
  filterRow: { display: "flex", gap: 8, marginBottom: 20 },
  filterBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e6ee", background: "#ffffff", color: "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  filterBtnActive: { background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderColor: "#f59e0b" },
  jobsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: 16 },
  jobCard: {
    background: "#ffffff", borderRadius: 16, padding: "20px",
    border: "1px solid", position: "relative",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  rankBadge: {
    position: "absolute", top: -1, left: 16,
    background: "linear-gradient(135deg, #f59e0b, #f59e0b)",
    color: "#fff", fontSize: 11, fontWeight: 800,
    padding: "3px 10px", borderRadius: "0 0 8px 8px",
  },
  matchHeader: { display: "flex", gap: 14, alignItems: "flex-start", marginTop: 16, marginBottom: 16 },
  jobTitle: { margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#111827" },
  jobMeta: { display: "flex", gap: 8, color: "#6b7280", fontSize: 12, flexWrap: "wrap" },
  skillsSection: { marginBottom: 12 },
  skillsSectionLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" },
  skillsRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  matchedChip: { padding: "3px 10px", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 20, fontSize: 12, color: "#fdba74", fontWeight: 500 },
  missingChip: { padding: "3px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, fontSize: 12, color: "#f87171", fontWeight: 500 },
  expandedDetails: { marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(17,24,39,0.06)" },
  detailBox: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(17,24,39,0.1)", borderRadius: 10, padding: "10px 14px" },
  detailLabel: { fontSize: 11, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
  detailValue: { fontSize: 13, color: "#111827", fontWeight: 600, textTransform: "capitalize" },
  cardActions: { display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(17,24,39,0.06)", flexWrap: "wrap" },
  detailsBtn: { padding: "8px 14px", background: "rgba(17,24,39,0.06)", border: "1px solid #e2e6ee", borderRadius: 8, color: "#4b5563", cursor: "pointer", fontSize: 13 },
  learnBtn: { padding: "8px 14px", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 8, color: "#fb923c", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  applyBtn: { padding: "8px 16px", background: "linear-gradient(135deg, #f97316, #ea580c)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block" },
  emptyCard: { padding: 64, textAlign: "center", background: "#ffffff", borderRadius: 16, border: "2px dashed #e2e6ee" },
};
