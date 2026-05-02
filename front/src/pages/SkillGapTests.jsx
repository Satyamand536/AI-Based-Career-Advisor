// src/pages/SkillGapTests.jsx — Skill Gap Detection + Adaptive Tests
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";

const DOMAINS = [
  { id: "React.js",        icon: "⚛️",  color: "#38bdf8" },
  { id: "Node.js",         icon: "🟢",  color: "#22c55e" },
  { id: "Python",          icon: "🐍",  color: "#f59e0b" },
  { id: "System Design",   icon: "🏗️",  color: "#818cf8" },
  { id: "DSA",             icon: "📐",  color: "#f472b6" },
  { id: "Docker & DevOps", icon: "🐳",  color: "#06b6d4" },
  { id: "SQL & Databases", icon: "🗄️",  color: "#a78bfa" },
  { id: "TypeScript",      icon: "🔷",  color: "#60a5fa" },
  { id: "Machine Learning",icon: "🤖",  color: "#fb923c" },
  { id: "AWS & Cloud",     icon: "☁️",  color: "#fbbf24" },
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

export default function SkillGapTests() {
  const [view, setView] = useState("select"); // select | test | result | gaps
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [skillGaps, setSkillGaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Timer
  useEffect(() => {
    if (view === "test" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); submitTest(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, test]);

  // Load skill gaps from profile
  useEffect(() => {
    loadSkillGaps();
  }, []);

  const loadSkillGaps = async () => {
    try {
      const res = await fetch("/api/jobs/recommendations?top_k=5", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.data?.skillGaps) {
          setSkillGaps(data.data.skillGaps.slice(0, 10));
        }
      }
    } catch (_) {}
  };

  const generateTest = async () => {
    if (!selectedDomain) { toast.error("Select a domain first"); return; }
    setLoading(true);
    const toastId = toast.loading(`🤖 Generating ${selectedDifficulty} ${selectedDomain} test...`);
    try {
      const res = await fetch("/api/test/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: selectedDomain, difficulty: selectedDifficulty }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok && data.testId) {
        // Fetch the test questions
        const testRes = await fetch(`/api/test/${data.testId}`, { credentials: "include" });
        const testData = await testRes.json();
        if (testData.ok) {
          setTest({ ...testData.test, testId: data.testId });
          setAnswers({});
          setCurrentQ(0);
          setTimeLeft((testData.test.questions?.length || 10) * 90); // 90s per question
          setView("test");
          toast.success(`📝 ${data.totalQuestions} questions ready!`, { id: toastId });
        }
      } else {
        toast.error(data.error || "Test generation failed", { id: toastId });
      }
    } catch (err) {
      toast.error("AI service error", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const submitTest = useCallback(async () => {
    if (!test) return;
    clearInterval(timerRef.current);

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < test.questions.length && timeLeft > 0) {
      const ok = window.confirm(`${test.questions.length - answeredCount} unanswered. Submit anyway?`);
      if (!ok) return;
    }

    setLoading(true);
    const answerArray = test.questions.map(q => ({
      question_id: q._id,
      selected_option: answers[q._id] ?? -1,
    }));

    try {
      const res = await fetch(`/api/test/${test.testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.result);
        setView("result");
        // Proactively update dashboard cache so it shows instantly
        const cached = sessionStorage.getItem("dashboardStats");
        if (cached) {
            const parsed = JSON.parse(cached);
            parsed.latestTestScore = data.result.score;
            parsed.latestTestDomain = data.result.domain || test.domain;
            sessionStorage.setItem("dashboardStats", JSON.stringify(parsed));
        } else {
            sessionStorage.removeItem("dashboardStats");
        }
      } else {
        toast.error(data.error || "Submission failed");
      }
    } catch (err) {
      toast.error("Submit error");
    } finally {
      setLoading(false);
    }
  }, [test, answers, timeLeft]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timerColor = timeLeft < 60 ? "#ef4444" : timeLeft < 120 ? "#f59e0b" : "#22c55e";
  const progress = test ? Object.keys(answers).length / test.questions.length : 0;

  return (
    <div style={layout.page}>
      <Sidebar />
      <main style={layout.main}>

        {/* ─── SELECT VIEW ─── */}
        {view === "select" && (
          <>
            <div style={styles.header}>
              <div>
                <h1 style={styles.h1}>📊 Skill Gap & Tests</h1>
                <p style={styles.subtitle}>Identify skill gaps from job matching · Take adaptive AI-generated tests · Update your career readiness</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: skillGaps.length > 0 ? "1fr 1.5fr" : "1fr", gap: 24, alignItems: "start" }}>
              {/* Skill Gaps from Job Matching */}
              {skillGaps.length > 0 && (
                <div style={{ ...styles.card, position: "sticky", top: 20 }}>
                  <h3 style={styles.cardTitle}>⚡ Detected Skill Gaps</h3>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
                    These skills appear in jobs you matched but are missing from your profile:
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {skillGaps.map((gap, i) => (
                      <div key={i} style={{ ...styles.gapChip, borderColor: gap.priority === "high" ? "#ef4444" : gap.priority === "medium" ? "#f59e0b" : "#64748b" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: gap.priority === "high" ? "#f87171" : gap.priority === "medium" ? "#fbbf24" : "#94a3b8" }}>
                              {gap.skill}
                            </span>
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              {gap.priority === "high" ? "🔴" : gap.priority === "medium" ? "🟡" : "⚪"} {gap.occurrences} jobs
                            </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, fontSize: 12, color: "#64748b", background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8 }}>
                    💡 Select a domain on the right that aligns with your skill gaps to take a targeted test. Passing tests increases your readiness score.
                  </div>
                </div>
              )}

              {/* Domain Selection */}
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>🎯 Select Test Domain</h3>
              <div style={styles.domainGrid}>
                {DOMAINS.map(domain => (
                  <button
                    key={domain.id}
                    onClick={() => setSelectedDomain(domain.id)}
                    style={{
                      ...styles.domainBtn,
                      borderColor: selectedDomain === domain.id ? domain.color : "rgba(255,255,255,0.08)",
                      background: selectedDomain === domain.id ? domain.color + "18" : "#0f172a",
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{domain.icon}</span>
                    <span style={{ fontSize: 12, color: selectedDomain === domain.id ? domain.color : "#94a3b8", fontWeight: 600 }}>
                      {domain.id}
                    </span>
                  </button>
                ))}
              </div>

              {/* Difficulty */}
              <div style={{ marginTop: 20 }}>
                <div style={styles.cardTitle}>Select Difficulty</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setSelectedDifficulty(d)}
                      style={{
                        ...styles.diffBtn,
                        background: selectedDifficulty === d ? (d === "Hard" ? "#ef4444" : d === "Medium" ? "#f59e0b" : "#22c55e") + "20" : "#0f172a",
                        borderColor: selectedDifficulty === d ? (d === "Hard" ? "#ef4444" : d === "Medium" ? "#f59e0b" : "#22c55e") : "#334155",
                        color: selectedDifficulty === d ? "#e2e8f0" : "#64748b",
                      }}
                    >
                      {d === "Easy" ? "🟢" : d === "Medium" ? "🟡" : "🔴"} {d}
                    </button>
                  ))}
                </div>
              </div>

                <button
                  onClick={generateTest}
                  disabled={!selectedDomain || loading}
                  style={{ ...styles.generateBtn, opacity: !selectedDomain || loading ? 0.5 : 1 }}
                >
                  {loading ? "🤖 Generating..." : "⚡ Generate AI Test (10 Questions)"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─── TEST VIEW ─── */}
        {view === "test" && test && (
          <>
            {/* Test Header */}
            <div style={styles.testHeader}>
              <div>
                <h2 style={{ ...styles.h1, fontSize: 22 }}>{test.domain} — {test.difficulty}</h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Question {currentQ + 1} of {test.questions.length}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ ...styles.timer, color: timerColor, borderColor: timerColor + "40" }}>
                  ⏱ {formatTime(timeLeft)}
                </div>
                <button onClick={submitTest} style={styles.submitBtn}>Submit Test</button>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: "#1e293b", borderRadius: 2, marginBottom: 24 }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg, #818cf8, #38bdf8)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>

            {/* Question navigator */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              {test.questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  style={{
                    width: 34, height: 34, borderRadius: 8, border: "1px solid",
                    background: answers[q._id] !== undefined ? "rgba(129,140,248,0.2)" : "#0f172a",
                    borderColor: i === currentQ ? "#818cf8" : answers[q._id] !== undefined ? "rgba(129,140,248,0.4)" : "#334155",
                    color: i === currentQ ? "#818cf8" : answers[q._id] !== undefined ? "#a5b4fc" : "#64748b",
                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Current question */}
            {(() => {
              const q = test.questions[currentQ];
              return (
                <div style={styles.questionCard}>
                  <h3 style={{ color: "#f1f5f9", fontSize: 18, lineHeight: 1.6, marginBottom: 24 }}>
                    Q{currentQ + 1}. {q.text}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {q.options.map((option, oi) => (
                      <button
                        key={oi}
                        onClick={() => {
                          setAnswers(prev => ({ ...prev, [q._id]: oi }));
                          if (currentQ < test.questions.length - 1) {
                            setTimeout(() => setCurrentQ(prev => prev + 1), 300);
                          }
                        }}
                        style={{
                          ...styles.optionBtn,
                          background: answers[q._id] === oi ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.03)",
                          borderColor: answers[q._id] === oi ? "#818cf8" : "#334155",
                          color: answers[q._id] === oi ? "#e2e8f0" : "#94a3b8",
                        }}
                      >
                        <span style={{ ...styles.optionLetter, background: answers[q._id] === oi ? "#818cf8" : "#1e293b" }}>
                          {["A","B","C","D"][oi]}
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                    <button disabled={currentQ === 0} onClick={() => setCurrentQ(c => c - 1)} style={styles.navBtn}>← Prev</button>
                    <button disabled={currentQ === test.questions.length - 1} onClick={() => setCurrentQ(c => c + 1)} style={styles.navBtn}>Next →</button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ─── RESULT VIEW ─── */}
        {view === "result" && result && (
          <>
            <div style={styles.header}>
              <h1 style={styles.h1}>📊 Test Results</h1>
            </div>

            {/* Score Card */}
            <div style={styles.scoreCard}>
              <div style={{ textAlign: "center" }}>
                <svg width={120} height={120} viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="12" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={result.score >= 70 ? "#22c55e" : result.score >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="12"
                    strokeDasharray={`${(result.score / 100) * 314} 314`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <text x="60" y="55" textAnchor="middle" fill="#f1f5f9" fontSize="26" fontWeight="bold">{result.score}</text>
                  <text x="60" y="76" textAnchor="middle" fill="#64748b" fontSize="13">out of 100</text>
                </svg>
                <div style={{ marginTop: 10, fontWeight: 700, color: result.score >= 70 ? "#22c55e" : result.score >= 50 ? "#f59e0b" : "#ef4444", fontSize: 18 }}>
                  {result.score >= 70 ? "Excellent! 🎉" : result.score >= 50 ? "Good job! 📈" : "Keep practicing 💪"}
                </div>
                <div style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>
                  {result.correct} / {result.total} correct
                </div>
              </div>

              {/* Skill Gaps from this test */}
              {result.skill_gaps?.length > 0 && (
                <div style={{ marginTop: 24, padding: 16, background: "#0f172a", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 10 }}>
                    🔴 Skill Gaps Detected
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.skill_gaps.map((gap, i) => (
                      <span key={i} style={{ padding: "3px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 20, fontSize: 12, color: "#f87171" }}>
                        {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detailed results */}
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {result.details?.map((d, i) => (
                <div key={i} style={{ ...styles.card, borderLeft: `4px solid ${d.is_correct ? "#22c55e" : "#ef4444"}` }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{d.is_correct ? "✅" : "❌"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, marginBottom: 8 }}>Q{i + 1}. {d.text}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, padding: "6px 10px", background: "rgba(129,140,248,0.1)", borderRadius: 6, color: "#a5b4fc" }}>
                          <strong>Your answer:</strong> {d.user_answer_text || "Skipped"}
                        </div>
                        <div style={{ fontSize: 12, padding: "6px 10px", background: "rgba(34,197,94,0.1)", borderRadius: 6, color: "#4ade80" }}>
                          <strong>Correct:</strong> {d.correct_answer_text}
                        </div>
                      </div>
                      {d.explanation && (
                        <div style={{ fontSize: 12, color: "#64748b", padding: "8px 12px", background: "#0f172a", borderRadius: 6, lineHeight: 1.6 }}>
                          {d.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => { setView("select"); setResult(null); setTest(null); }} style={styles.generateBtn}>
                📝 Take Another Test
              </button>
              <button onClick={() => navigate("/roadmap")} style={{ ...styles.generateBtn, background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
                🗺️ Update Roadmap with Gaps
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const layout = {
  page: { display: "flex", minHeight: "100vh", background: "#0f172a" },
  main: { flex: 1, marginLeft: 240, padding: "36px 40px", overflowY: "auto" },
};

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 },
  h1: { margin: 0, fontSize: 28, color: "#f1f5f9", fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#64748b", fontSize: 13 },
  card: { background: "#1e293b", borderRadius: 14, padding: "20px", border: "1px solid rgba(255,255,255,0.06)" },
  cardTitle: { margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#e2e8f0" },
  gapChip: { padding: "6px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid", display: "flex", gap: 4, alignItems: "center" },
  domainGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 },
  domainBtn: { padding: "16px 12px", borderRadius: 12, border: "2px solid", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" },
  diffBtn: { padding: "10px 20px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" },
  generateBtn: { marginTop: 20, padding: "14px 28px", background: "linear-gradient(135deg, #818cf8, #38bdf8)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "block", width: "100%" },
  testHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 },
  timer: { padding: "10px 18px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid", fontSize: 18, fontWeight: 700, fontFamily: "monospace" },
  submitBtn: { padding: "10px 20px", background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" },
  questionCard: { background: "#1e293b", borderRadius: 16, padding: "28px" },
  optionBtn: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: "2px solid", cursor: "pointer", textAlign: "left", fontSize: 14, transition: "all 0.15s" },
  optionLetter: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, color: "#fff", fontSize: 13, transition: "background 0.2s" },
  navBtn: { padding: "8px 18px", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#64748b", cursor: "pointer" },
  scoreCard: { background: "#1e293b", borderRadius: 16, padding: "32px", border: "1px solid rgba(255,255,255,0.06)", maxWidth: 500 },
};
