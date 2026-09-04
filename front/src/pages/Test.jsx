import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({}); // { question_id: selected_index }
  const [result, setResult] = useState(null);
  const [domain, setDomain] = useState("React.js");
  const [difficulty, setDifficulty] = useState("Medium");

  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const navigate = useNavigate();

  const submitTest = useCallback(async () => {
    if (!test) return;
    
    const answeredCount = Object.keys(answers).length;
    const totalCount = test.questions.length;
    
    // Warn but don't block if not all answered (allow timer-forced submission too)
    if (answeredCount < totalCount) {
      const unanswered = totalCount - answeredCount;
      const confirmed = window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway? Unanswered questions will be marked as skipped.`);
      if (!confirmed) return;
    }

    setLoading(true);
    try {
        const payload = {
            answers: Object.entries(answers).map(([qId, optIdx]) => ({
                question_id: qId,
                selected_option: optIdx
            }))
        };

        const res = await fetch(`/api/test/${test._id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include"
        });
        
        const data = await res.json();
        if (data.ok) {
            setResult(data.result);
            toast.success("Test submitted!");
        } else {
            toast.error(data.error || "Submission failed");
        }
    } catch (err) {
        toast.error("Error submitting test");
    } finally {
        setLoading(false);
    }
  }, [test, answers]);

  useEffect(() => {
    let timer;
    if (test && !result && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [test, result, timeLeft, submitTest]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const fetchTest = useCallback(async (testId) => {
    try {
      const res = await fetch(`/api/test/${testId}`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setTest(data.test);
      } else {
        toast.error(data.message || "Failed to load test details.");
      }
    } catch (err) {
      toast.error("Error loading test");
    } finally {
      setLoading(false);
    }
  }, []);

  const generateTest = async () => {
    const toastId = toast.loading("🤖 AI is preparing your custom test questions...", {
      style: {
        background: '#333',
        color: '#fff',
      },
    });
    setLoading(true);
    setTest(null);
    setResult(null);
    setAnswers({});
    
    try {
      const res = await fetch("/api/test/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, difficulty }),
        credentials: "include"
      });
      
      const data = await res.json();
      if (data.ok) {
        toast.success("Test ready! Let's begin.", { id: toastId });
        fetchTest(data.testId);
      } else {
        toast.error(data.error || "Failed to generate test. Please try a different subject.", { id: toastId });
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error occurred. Please check your connection.", { id: toastId });
      setLoading(false);
    }
  };

  const handleOptionSelect = (qId, optionIdx) => {
    setAnswers({ ...answers, [qId]: optionIdx });
  };


  return (
    <div className="home-container">
      <Navbar />
      <div className="dashboard-content" style={{ maxWidth: 800 }}>
        
        {!test && !result && (
            <div className="content-card" style={{ textAlign: "center" }}>
                {/* Workflow context */}
                <div style={{ background: "#f0f5ff", border: "1px solid #adc6ff", borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#1d39c4" }}>
                  <strong>📊 How tests work:</strong> Your results automatically update your Skill Gap profile and personalize your Roadmap
                </div>
                <h1>Skill Assessment</h1>
                <p>AI-generated questions to verify your skills and update your career readiness score.</p>
                
                <div style={{ margin: "20px 0", display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <input 
                        type="text" 
                        value={domain} 
                        onChange={(e) => setDomain(e.target.value)} 
                        placeholder="Subject (e.g., Python)"
                        style={{ padding: 10, borderRadius: 4, border: "1px solid #ddd", flex: 1, minWidth: 200 }}
                    />
                    <select 
                        value={difficulty} 
                        onChange={(e) => setDifficulty(e.target.value)}
                        style={{ padding: 10, borderRadius: 4, border: "1px solid #ddd", flex: 1, minWidth: 200 }}
                    >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                    </select>
                </div>

                <button 
                    onClick={generateTest} 
                    disabled={loading}
                    style={{ 
                        padding: "10px 20px", background: "royalblue", color: "#fff", 
                        border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", width: "100%", marginTop: 10
                    }}
                >
                    {loading ? "Generating..." : "Start Test"}
                </button>
            </div>
        )}

        {test && !result && (
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>{test.description}</h2>
                    <div style={{ 
                        padding: '10px 20px', 
                        background: timeLeft < 60 ? '#fff1f0' : '#f6ffed', 
                        border: `1px solid ${timeLeft < 60 ? '#ffa39e' : '#b7eb8f'}`,
                        borderRadius: 8,
                        fontWeight: 'bold',
                        color: timeLeft < 60 ? '#cf1322' : '#389e0d',
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span>⏱️</span>
                        <span style={{ fontFamily: "monospace", fontSize: "1.2em" }}>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {test.questions.map((q, i) => (
                    <div key={q._id} style={{ marginBottom: 30, background: "#fff", padding: 20, borderRadius: 8 }}>
                        <h4 style={{ margin: "0 0 15px 0" }}>{i+1}. {q.text}</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {q.options.map((opt, idx) => (
                                <label key={idx} style={{ 
                                    padding: 10, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer",
                                    background: answers[q._id] === idx ? "#e6f7ff" : "#fff",
                                    borderColor: answers[q._id] === idx ? "#22d3a5" : "#ddd"
                                }}>
                                    <input 
                                        type="radio" 
                                        name={`q_${q._id}`} 
                                        checked={answers[q._id] === idx}
                                        onChange={() => handleOptionSelect(q._id, idx)}
                                        style={{ marginRight: 10 }}
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}

                <button 
                    onClick={submitTest}
                    disabled={loading}
                    style={{ 
                        width: "100%", padding: 15, background: "#52c41a", color: "#fff", 
                        border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold", fontSize: 16
                    }}
                >
                    {loading ? "Submitting..." : "Submit Answers"}
                </button>
            </div>
        )}

        {result && (
            <div style={{ padding: 0, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
                
                {/* Premium Result Header */}
                <div style={{ 
                    background: result.score >= 70 
                        ? "linear-gradient(135deg, #52c41a, #389e0d)" 
                        : "linear-gradient(135deg, #faad14, #d48806)",
                    padding: "40px 30px",
                    textAlign: "center",
                    color: "#fff",
                    position: "relative"
                }}>
                    <div style={{ position: "absolute", top: -20, right: -20, fontSize: 100, opacity: 0.1, fontWeight: "bold" }}>
                        {result.score >= 70 ? "A+" : "B"}
                    </div>
                    <h1 style={{ margin: "0 0 10px 0", fontSize: 28 }}>Assessment Complete</h1>
                    <div style={{ fontSize: 64, fontWeight: "bold", lineHeight: 1 }}>
                        {result.score}%
                    </div>
                    <p style={{ margin: "10px 0 0", opacity: 0.9, fontSize: 16 }}>
                        {result.correct} / {result.total} Correct
                    </p>
                </div>

                <div style={{ padding: "25px 30px" }}>
                {result.skill_gaps && result.skill_gaps.length > 0 && (
                    <div style={{ marginBottom: 25, padding: 20, background: "#fff1f0", borderRadius: 12, border: "1px solid #ffa39e" }}>
                        <h4 style={{ color: "#cf1322", margin: "0 0 10px 0", fontSize: 16 }}>Identified Skill Gaps</h4>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {result.skill_gaps.map((gap, gi) => (
                                <span key={gi} style={{ 
                                    padding: "4px 12px", background: "#fff", border: "1px solid #cf1322", 
                                    borderRadius: 20, fontSize: 13, color: "#cf1322", fontWeight: "500"
                                }}>
                                    {gap}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Detailed Analysis */}
                {result && result.details && (
                    <div style={{ marginTop: 30, textAlign: "left" }}>
                        <h3>Detailed Analysis</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            {result.details.map((detail, idx) => (
                                <div key={idx} style={{ 
                                    padding: 15, 
                                    border: "1px solid #eee", 
                                    borderRadius: 8,
                                    background: detail.is_correct ? "#f6ffed" : "#fff1f0",
                                    borderLeft: `4px solid ${detail.is_correct ? "#52c41a" : "#cf1322"}`
                                }}>
                                    <h4 style={{ margin: "0 0 10px 0" }}>
                                        {idx + 1}. {detail.text}
                                    </h4>
                                    
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 14 }}>
                                        <div>
                                            <strong>Your Answer:</strong><br/>
                                            <span style={{ color: detail.is_correct ? "#52c41a" : "#cf1322" }}>
                                                {detail.user_answer_text} {detail.is_correct ? "✅" : "❌"}
                                            </span>
                                        </div>
                                        
                                        {!detail.is_correct && (
                                            <div>
                                                <strong>Correct Answer:</strong><br/>
                                                <span style={{ color: "#52c41a" }}>
                                                    {detail.correct_answer_text} ✅
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {detail.explanation && (
                                        <div style={{ marginTop: 15, fontSize: 13, background: "rgba(0,0,0,0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.05)" }}>
                                            <div style={{ fontWeight: "bold", marginBottom: 8, color: "#555" }}>🎓 CTO Analysis</div>
                                            {detail.explanation.split('\n').map((line, lidx) => {
                                                if (!line.trim()) return null;
                                                const parts = line.split(':');
                                                if (parts.length < 2) return <p key={lidx} style={{ margin: "4px 0" }}>{line}</p>;
                                                
                                                const label = parts[0].trim();
                                                const content = parts.slice(1).join(':').trim();
                                                
                                                // Colorize based on point type
                                                let bgColor = "transparent";
                                                let icon = "🔹";
                                                if (label.includes("User Answer")) { bgColor = "#f0f5ff"; icon = "📝"; }
                                                if (label.includes("Real Industry Answer")) { bgColor = "#f9f0ff"; icon = "🏭"; }
                                                if (label.includes("Concept Correction")) { bgColor = "#fff7e6"; icon = "⚖️"; }
                                                if (label.includes("Interview Tip")) { bgColor = "#f6ffed"; icon = "💡"; }

                                                return (
                                                    <div key={lidx} style={{ 
                                                        marginBottom: 6, 
                                                        padding: "6px 10px", 
                                                        background: bgColor, 
                                                        borderRadius: 4,
                                                        borderLeft: "3px solid rgba(0,0,0,0.1)"
                                                    }}>
                                                        <strong>{icon} {label}:</strong> {content}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}



                <div style={{ marginTop: 30, display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => navigate("/dashboard")} style={{ 
                        padding: "12px 24px", cursor: "pointer", borderRadius: 8, border: "1px solid #d9d9d9",
                        background: "#fff", fontSize: 14, fontWeight: "500"
                    }}>
                        Back to Dashboard
                    </button>
                    <button 
                        onClick={() => navigate("/roadmap")}
                        style={{ 
                            padding: "12px 24px", 
                            background: "linear-gradient(135deg, #1d39c4, #722ed1)", 
                            color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
                            fontSize: 14, fontWeight: "bold"
                        }}
                    >
                        View Learning Roadmap
                    </button>
                </div>
                </div>
            </div>
        )}


      </div>
    </div>
  );
}
