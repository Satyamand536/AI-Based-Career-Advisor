import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SigninModal from "../components/Signin";
import SignupModal from "../components/Signup";

const FEATURES = [
    { icon: "🧠", title: "Profile Intelligence", desc: "AI parses your resume and builds a deep skill intelligence graph with experience scoring." },
    { icon: "🎯", title: "Tech Job Match", desc: "Hybrid AI engine (embeddings + skills + experience) ranks real tech jobs by match percentage." },
    { icon: "🧪", title: "Skill Gap Tests", desc: "Take adaptive AI-generated assessments across 10 domains and track your readiness score." },
    { icon: "🗺️", title: "Learning Roadmap", desc: "Auto-generates a week-by-week placement-focused learning path based on your gaps." },
    { icon: "🤖", title: "AI Career Mentor", desc: "An LLM-powered mentor that knows your profile and coaches you toward your target role." },
    { icon: "📊", title: "Career Dashboard", desc: "Mission control showing readiness score, test results, top match, and next roadmap step." },
];

const PIPELINE = [
    { label: "Resume Upload", icon: "📄" },
    { label: "Skill Analysis", icon: "🧬" },
    { label: "Job Matching", icon: "🎯" },
    { label: "Gap Detection", icon: "🔍" },
    { label: "AI Tests", icon: "🧪" },
    { label: "Roadmap", icon: "🗺️" },
    { label: "Job Ready", icon: "🚀" },
];

export default function HomePage() {
    const [user, setUser] = useState(null);
    const [showSignin, setShowSignin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkLogin = async () => {
            try {
                const res = await fetch("/api/user/check-login", { credentials: "include" });
                const data = await res.json();
                if (data.loggedIn) {
                    setUser(data.user?.fullName || data.user?.name || "User");
                }
            } catch (err) { /* silent */ }
        };
        checkLogin();
    }, []);

    const handleGetStarted = () => {
        if (user) navigate("/dashboard");
        else setShowSignin(true);
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/user/logout", { credentials: "include" });
            sessionStorage.clear(); // Ensure cache is zeroed out
            setUser(null);
            toast.success("Logged out");
        } catch (_) {}
    };

    return (
        <div style={s.page}>
            {/* ── NAVBAR ── */}
            <nav style={s.navbar}>
                <div style={s.logo}>
                    <span style={{ color: "#f59e0b", marginRight: 8 }}>⚡</span>CareerAI
                </div>
                <div style={s.navRight}>
                    {user ? (
                        <>
                            <span style={s.navUser}>👤 {user}</span>
                            <button style={s.navBtnOutline} onClick={() => navigate("/dashboard")}>Dashboard</button>
                            <button style={s.navBtnGhost} onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button style={s.navBtnGhost} onClick={() => setShowSignin(true)}>Login</button>
                            <button style={s.navBtnPrimary} onClick={() => setShowSignup(true)}>Get Started Free</button>
                        </>
                    )}
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={s.hero}>
                <div style={s.heroBadge}>🚀 AI-Powered Career Intelligence Platform</div>
                <h1 style={s.heroTitle}>
                    Land your dream<br />
                    <span style={s.heroGradient}>tech job with AI</span>
                </h1>
                <p style={s.heroDesc}>
                    Upload your resume. Get AI-matched to real tech jobs. Identify skill gaps, take adaptive tests,
                    and follow a personalized roadmap to become placement-ready.
                </p>
                <div style={s.heroActions}>
                    <button style={s.ctaPrimary} onClick={handleGetStarted}>
                        {user ? "Go to Dashboard →" : "Start for Free →"}
                    </button>
                    <button style={s.ctaSecondary} onClick={() => setShowSignin(true)}>
                        {user ? "View My Profile" : "Login"}
                    </button>
                </div>
                <div style={s.heroStats}>
                    {[["10+", "Tech Domains Covered"], ["3", "Real Job APIs"], ["AI-Powered", "Scoring Engine"]].map(([val, label]) => (
                        <div key={label} style={s.statItem}>
                            <div style={s.statVal}>{val}</div>
                            <div style={s.statLabel}>{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── PIPELINE ── */}
            <section style={s.section}>
                <div style={s.sectionInner}>
                    <div style={s.sectionBadge}>Career Intelligence Pipeline</div>
                    <h2 style={s.sectionTitle}>From resume to offer letter — in one platform</h2>
                    <div style={s.pipeline}>
                        {PIPELINE.map((step, i) => (
                            <React.Fragment key={step.label}>
                                <div style={s.pipelineStep}>
                                    <div style={s.pipelineIcon}>{step.icon}</div>
                                    <div style={s.pipelineLabel}>{step.label}</div>
                                </div>
                                {i < PIPELINE.length - 1 && <div style={s.pipelineArrow}>→</div>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section style={{ ...s.section, background: "#f5f6f8" }}>
                <div style={s.sectionInner}>
                    <div style={s.sectionBadge}>Platform Features</div>
                    <h2 style={s.sectionTitle}>Everything you need to advance your tech career</h2>
                    <div style={s.featureGrid}>
                        {FEATURES.map(f => (
                            <div key={f.title} style={s.featureCard}>
                                <div style={s.featureIcon}>{f.icon}</div>
                                <h3 style={s.featureTitle}>{f.title}</h3>
                                <p style={s.featureDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section style={s.ctaBanner}>
                <div style={s.sectionInner}>
                    <h2 style={{ ...s.sectionTitle, marginBottom: 12 }}>Ready to accelerate your career?</h2>
                    <p style={{ color: "#4b5563", fontSize: 16, marginBottom: 32 }}>
                        Join the platform built for serious tech professionals and students.
                    </p>
                    <button style={s.ctaPrimary} onClick={handleGetStarted}>
                        {user ? "Back to Dashboard →" : "Create Free Account →"}
                    </button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={s.footer}>
                <div style={s.footerInner}>
                    <div style={s.footerBrand}>
                        <div style={s.logo}><span style={{ color: "#f59e0b", marginRight: 8 }}>⚡</span>CareerAI</div>
                        <p style={{ color: "#475569", fontSize: 13, marginTop: 10, lineHeight: 1.7, maxWidth: 260 }}>
                            The AI-powered career operating system for tech professionals and students.
                        </p>
                    </div>
                    <div style={s.footerLinks}>
                        <div style={s.footerCol}>
                            <div style={s.footerColTitle}>Platform</div>
                            {["Profile Intelligence","Tech Job Match","Skill Gap Tests","Learning Roadmap","AI Career Mentor"].map(f => (
                                <div key={f} style={s.footerLink}>{f}</div>
                            ))}
                        </div>
                        <div style={s.footerCol}>
                            <div style={s.footerColTitle}>For Developers</div>
                            {["Software Engineers","Data Scientists","DevOps Engineers","AI/ML Engineers","Full Stack Devs"].map(f => (
                                <div key={f} style={s.footerLink}>{f}</div>
                            ))}
                        </div>
                        <div style={s.footerCol}>
                            <div style={s.footerColTitle}>Powered By</div>
                            {["OpenRouter LLM","MPNet Embeddings","Adzuna Jobs API","The Muse API","MongoDB Atlas"].map(f => (
                                <div key={f} style={s.footerLink}>{f}</div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={s.footerBottom}>
                    <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 24 }} />
                    <span style={{ color: "#e2e6ee", fontSize: 13 }}>© 2026 CareerAI. Built for tech professionals — not generic job seekers.</span>
                </div>
            </footer>

            {/* ── MODALS ── */}
            {showSignin && (
                <SigninModal
                    close={() => setShowSignin(false)}
                    openSignup={() => { setShowSignin(false); setShowSignup(true); }}
                    onLoginSuccess={(name) => {
                        setUser(name);
                        setShowSignin(false);
                        navigate("/dashboard");
                    }}
                />
            )}
            {showSignup && (
                <SignupModal
                    close={() => setShowSignup(false)}
                    openSignin={() => { setShowSignup(false); setShowSignin(true); }}
                    onSignupSuccess={(name) => {
                        setUser(name);
                        setShowSignup(false);
                        navigate("/dashboard");
                    }}
                />
            )}
        </div>
    );
}

const s = {
    page: {
        minHeight: "100vh",
        background:
            "radial-gradient(1200px 500px at 15% -10%, rgba(249,115,22,0.12), transparent 60%)," +
            "radial-gradient(1000px 500px at 90% -10%, rgba(245,158,11,0.12), transparent 60%)," +
            "#f5f6f8",
        color: "#111827", fontFamily: "'Inter', sans-serif", overflowX: "hidden",
    },
    navbar: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 60px", background: "rgba(15,22,38,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(17,24,39,0.06)", position: "sticky", top: 0, zIndex: 100,
    },
    logo: { fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" },
    navRight: { display: "flex", alignItems: "center", gap: 12 },
    navUser: { fontSize: 14, color: "#4b5563", marginRight: 4 },
    navBtnPrimary: {
        padding: "9px 20px", background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14,
        cursor: "pointer", boxShadow: "0 4px 12px rgba(234,88,12,0.3)",
    },
    navBtnOutline: {
        padding: "9px 20px", background: "transparent", color: "#111827",
        border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10, fontWeight: 600,
        fontSize: 14, cursor: "pointer",
    },
    navBtnGhost: {
        padding: "9px 20px", background: "transparent", color: "#4b5563",
        border: "none", borderRadius: 10, fontWeight: 500, fontSize: 14, cursor: "pointer",
    },
    hero: {
        padding: "100px 60px 80px", maxWidth: 900, margin: "0 auto", textAlign: "center",
        position: "relative",
    },
    heroBadge: {
        display: "inline-block", padding: "7px 18px",
        background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)",
        borderRadius: 999, fontSize: 13, color: "#fdba74", fontWeight: 600, marginBottom: 28,
    },
    heroTitle: {
        fontSize: "clamp(2.4rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.15,
        margin: "0 0 24px", color: "#111827",
    },
    heroGradient: {
        background: "linear-gradient(135deg, #f97316, #f59e0b, #ec4899)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    heroDesc: {
        fontSize: 18, color: "#4b5563", lineHeight: 1.7, maxWidth: 640,
        margin: "0 auto 40px",
    },
    heroActions: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 },
    ctaPrimary: {
        padding: "15px 36px", background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700,
        cursor: "pointer", boxShadow: "0 8px 24px rgba(234,88,12,0.4)", transition: "all 0.2s",
    },
    ctaSecondary: {
        padding: "15px 36px", background: "rgba(17,24,39,0.06)",
        color: "#111827", border: "1px solid rgba(17,24,39,0.12)",
        borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer",
    },
    heroStats: { display: "flex", gap: 48, justifyContent: "center", flexWrap: "wrap" },
    statItem: { textAlign: "center" },
    statVal: { fontSize: 28, fontWeight: 900, color: "#111827" },
    statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" },
    section: { background: "#f5f6f8", padding: "80px 60px" },
    sectionInner: { maxWidth: 1100, margin: "0 auto", textAlign: "center" },
    sectionBadge: {
        display: "inline-block", padding: "5px 14px",
        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: 20, fontSize: 12, color: "#fcd34d", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 20,
    },
    sectionTitle: { fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#111827", margin: "0 0 48px" },
    pipeline: {
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, flexWrap: "wrap",
    },
    pipelineStep: { textAlign: "center" },
    pipelineIcon: {
        width: 56, height: 56, borderRadius: 14,
        background: "#ffffff", border: "1px solid rgba(17,24,39,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, margin: "0 auto 8px",
    },
    pipelineLabel: { fontSize: 11, color: "#4b5563", fontWeight: 600 },
    pipelineArrow: { color: "#e2e6ee", fontSize: 20, margin: "0 4px", paddingBottom: 24 },
    featureGrid: {
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 20, textAlign: "left",
    },
    featureCard: {
        background: "#ffffff", borderRadius: 16, padding: 28,
        border: "1px solid rgba(17,24,39,0.06)",
        transition: "transform 0.2s, border-color 0.2s",
    },
    featureIcon: { fontSize: 32, marginBottom: 16 },
    featureTitle: { margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: "#111827" },
    featureDesc: { margin: 0, fontSize: 14, color: "#4b5563", lineHeight: 1.7 },
    ctaBanner: {
        background: "linear-gradient(135deg, #e2e6ee 0%, #e2e6ee 100%)",
        padding: "80px 60px", textAlign: "center",
        borderTop: "1px solid rgba(17,24,39,0.06)",
    },
    footer: {
        padding: "60px 60px 24px", borderTop: "1px solid rgba(17,24,39,0.06)",
        background: "#070c18",
    },
    footerInner: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40, marginBottom: 40, maxWidth: 1100, margin: "0 auto 40px" },
    footerBrand: { flexShrink: 0 },
    footerLinks: { display: "flex", gap: 60, flexWrap: "wrap" },
    footerCol: { minWidth: 140 },
    footerColTitle: { fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 },
    footerLink: { fontSize: 13, color: "#e2e6ee", marginBottom: 8 },
    footerBottom: { textAlign: "center", maxWidth: 1100, margin: "0 auto" },
};
