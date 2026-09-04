// src/pages/ProfileIntelligence.jsx — Resume Upload + Skill Graph + Scorecard
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";

const SKILL_CATEGORIES = {
  "Frontend":  { color: "#f59e0b", skills: ["React","Vue","Angular","HTML","CSS","TypeScript","Next.js","Redux"] },
  "Backend":   { color: "#f59e0b", skills: ["Node.js","Express","Python","Django","Flask","Java","Spring","FastAPI"] },
  "Database":  { color: "#34d399", skills: ["MongoDB","PostgreSQL","MySQL","Redis","Firebase","DynamoDB"] },
  "DevOps":    { color: "#fb923c", skills: ["Docker","Kubernetes","AWS","GCP","Azure","CI/CD","Terraform","Linux"] },
  "AI / ML":   { color: "#f472b6", skills: ["Python","TensorFlow","PyTorch","scikit-learn","pandas","OpenAI API","LangChain"] },
  "Mobile":    { color: "#fcd34d", skills: ["React Native","Flutter","Swift","Kotlin","Android","iOS"] },
};

export default function ProfileIntelligence() {
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [skillGraph, setSkillGraph] = useState(null);
  const [skills, setSkills] = useState([]);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/user/check-login", { credentials: "include" });
      const data = await res.json();
      if (!data.loggedIn) { navigate("/"); return; }
      setProfile(data.user);

      // Load resume skills if available
      if (data.user.resume_url) {
        loadSkillGraph(data.user._id);
      }
    } catch (err) {
      toast.error("Failed to load profile");
    }
  };

  const loadSkillGraph = async () => {
    try {
      const res = await fetch("/api/resume/skills", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.skills) {
          setSkills(data.skills);
          buildSkillGraph(data.skills);
        }
      }
    } catch (_) {}
  };

  const buildSkillGraph = (skills) => {
    const skillsLower = skills.map(s => s.toLowerCase());
    const graph = {};
    Object.entries(SKILL_CATEGORIES).forEach(([cat, { color, skills: catSkills }]) => {
      const matched = catSkills.filter(s => skillsLower.includes(s.toLowerCase()));
      if (matched.length > 0) {
        graph[cat] = { skills: matched, color, total: catSkills.length };
      }
    });
    setSkillGraph(graph);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      toast.error("Please upload PDF or Word document");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("🧠 Parsing resume with AI...");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();

      if (data.ok || data.success) {
        toast.success("✅ Resume parsed! Skill graph generated.", { id: toastId });
        
        // Clear cached data so other tabs reload
        sessionStorage.removeItem("dashboardStats");
        sessionStorage.removeItem("techJobsData");
        sessionStorage.removeItem("roadmapData"); // Force roadmap reload with new profile
        
        await loadProfile();
      } else {
        toast.error(data.message || "Upload failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Upload failed. Check server connection.", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleUpload(file);
  };

  const experienceYears = profile?.experience_years || 0;
  const readiness = profile?.readiness_score || 0;

  // Scorecard score calculation:
  // If experienceYears is 0 but they have skills, assign 5 as base internship score
  const expScore = experienceYears > 0 ? Math.min(100, experienceYears * 15) : (skills.length > 0 ? 5 : 0);
  const skillScore = Math.min(100, skills.length * 8);

  const scores = {
    skillDepth: skillScore,
    experience: expScore,
    readiness: readiness,
    overall: Math.round((skillScore + expScore + readiness) / 3),
  };

  return (
    <div style={layout.page}>
      <Sidebar />
      <main style={layout.main}>

        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>🧠 Profile Intelligence</h1>
            <p style={styles.subtitle}>Upload your resume · Extract skills · Build your intelligence graph</p>
          </div>
          {profile?.resume_url && (
            <button onClick={() => navigate("/jobs")} style={styles.ctaBtn}>
              🎯 Find Matching Jobs →
            </button>
          )}
        </div>

        <div style={styles.grid}>
          {/* Resume Upload Zone */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📄 Resume Upload</h3>
            <div
              style={{ ...styles.dropZone, borderColor: dragOver ? "#f59e0b" : "#e2e6ee", background: dragOver ? "rgba(245,158,11,0.05)" : "transparent" }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => handleUpload(e.target.files[0])} />
              {uploading ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
                  <div style={{ color: "#f59e0b", fontWeight: 600 }}>AI is parsing your resume...</div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Extracting skills, experience, education</div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{profile?.resume_url ? "✅" : "📁"}</div>
                  <div style={{ color: "#111827", fontWeight: 600, marginBottom: 6 }}>
                    {profile?.resume_url ? "Resume Uploaded — Drop new to replace" : "Drop resume here or click to browse"}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>PDF, DOC, DOCX · Max 5MB</div>
                </div>
              )}
            </div>

            {/* Resume info */}
            {profile?.resume_url && (
              <div style={styles.resumeInfo}>
                <span>📋</span>
                <span style={{ color: "#4b5563", fontSize: 13 }}>Resume active · AI-parsed ✓</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#f97316" }}>● Live</span>
              </div>
            )}

            {/* Pipeline explanation */}
            <div style={styles.pipelineHint}>
              {["Upload Resume", "Extract Text", "AI Skill Extraction", "Generate Embeddings", "Job Matching"].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{step}</span>
                  {i < arr.length - 1 && <span style={{ color: "#e2e6ee" }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Candidate Scorecard */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🏆 Candidate Scorecard</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Skill Depth", value: scores.skillDepth, color: "#f59e0b", desc: `${skills.length} skills extracted` },
                { label: "Experience",  value: scores.experience,  color: "#f59e0b", desc: `${experienceYears}+ years estimated` },
                { label: "Readiness",   value: scores.readiness,   color: "#f97316", desc: "AI career readiness score" },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#4b5563" }}>{item.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}/100</span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressBar, width: `${item.value}%`, background: item.color }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{item.desc}</div>
                </div>
              ))}
              <div style={styles.overallScore}>
                <span style={{ fontSize: 13, color: "#4b5563" }}>Overall Score</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{scores.overall}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Skill Graph */}
        {skills.length > 0 && (
          <div style={{ ...styles.card, marginTop: 24 }}>
            <h3 style={styles.cardTitle}>⚡ Skill Intelligence Graph</h3>
            <div style={styles.allSkills}>
              {skills.slice(0, 30).map((skill, i) => (
                <span key={i} style={styles.skillChip}>{skill}</span>
              ))}
              {skills.length > 30 && (
                <span style={{ ...styles.skillChip, background: "rgba(17,24,39,0.06)", color: "#6b7280" }}>
                  +{skills.length - 30} more
                </span>
              )}
            </div>
            {skillGraph && Object.keys(skillGraph).length > 0 && (
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {Object.entries(skillGraph).map(([cat, { skills: catSkills, color, total }]) => (
                  <div key={cat} style={{ ...styles.graphNode, borderColor: color + "40" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{cat}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{catSkills.length}/{total} skills detected</div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressBar, width: `${(catSkills.length / total) * 100}%`, background: color }} />
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {catSkills.map((s, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 6px", background: color + "15", color, borderRadius: 4 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No resume state */}
        {!profile?.resume_url && !uploading && (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <h3 style={{ color: "#111827", marginBottom: 8 }}>Start your Career Intelligence profile</h3>
            <p style={{ color: "#6b7280", maxWidth: 480, lineHeight: 1.6 }}>
              Upload your resume above. Our AI will extract your skills, build your intelligence graph,
              and generate MPNet embeddings for precise job matching using cosine similarity.
            </p>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 },
  h1: { margin: 0, fontSize: 28, color: "#111827", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#6b7280", fontSize: 14 },
  ctaBtn: {
    padding: "12px 22px", background: "linear-gradient(135deg, #f59e0b, #f59e0b)",
    border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 },
  card: { background: "#ffffff", borderRadius: 16, padding: "24px", border: "1px solid rgba(17,24,39,0.06)" },
  cardTitle: { margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#111827" },
  dropZone: {
    border: "2px dashed", borderRadius: 12, padding: "36px 20px",
    cursor: "pointer", transition: "all 0.2s", marginBottom: 14,
  },
  resumeInfo: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(249,115,22,0.08)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.2)", marginBottom: 12 },
  pipelineHint: { display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid rgba(17,24,39,0.06)" },
  progressTrack: { height: 6, background: "#f5f6f8", borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 3, transition: "width 0.8s ease" },
  overallScore: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 0", borderTop: "1px solid rgba(17,24,39,0.06)", marginTop: 4 },
  allSkills: { display: "flex", flexWrap: "wrap", gap: 8 },
  skillChip: { padding: "5px 12px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 20, fontSize: 12, color: "#a5b4fc", fontWeight: 500 },
  graphNode: { padding: 14, background: "#f5f6f8", borderRadius: 10, border: "1px solid" },
  emptyCard: { marginTop: 32, padding: 48, textAlign: "center", background: "#ffffff", borderRadius: 16, border: "2px dashed #e2e6ee" },
};
