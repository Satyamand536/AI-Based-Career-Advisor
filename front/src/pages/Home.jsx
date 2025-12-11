import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";  // ✅ Import करो
import "./Home.css";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch("/user/check-login", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.loggedIn) setUser(data.user.fullName || data.user.name);
        else setUser(null);
      } catch (err) {
        console.error("Login check failed:", err);
      }
    };
    checkLogin();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      toast.error("Please login first");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) toast.success(`Selected: ${file.name}`);
  };

  return (
    <div className="home-container">
      {/* USE NAVBAR COMPONENT */}
      <Navbar />

      {/* HERO SECTION */}
      <div className="hero">
        <div className="hero-content">
          <h1>Unlock your career potential with AI guidance</h1>
          <p>
            Navigate your professional journey with AI insights. Get smart,
            data-backed recommendations to achieve your goals.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={handleGetStarted}>
              Get Started
            </button>
            <button className="btn-secondary">Learn More</button>
          </div>
        </div>

        <div className="hero-image">
          <img src="/images/right1.png" alt="AI Guidance Illustration" />
        </div>
      </div>

      {/* FEATURE SECTION */}
      <section className="features">
        <h2>Powerful career development tools</h2>
        <div className="cards">
          <div className="card">
            <h3>Personalized Career Recommendations</h3>
            <p>AI suggestions tailored to your skills and interests.</p>
          </div>
          <div className="card">
            <h3>Curated Learning Paths</h3>
            <p>Grow with guided plans matching your career goals.</p>
          </div>
          <div className="card">
            <h3>Precision Job Matching</h3>
            <p>Find ideal job roles using data-driven analysis.</p>
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="ai-section">
        <div className="ai-text">
          <h2>How our AI transforms career guidance</h2>
          <p>
            Advanced algorithms analyze your profile to suggest personalized
            learning and job strategies.
          </p>
          <button onClick={handleGetStarted}>Learn More</button>
        </div>
        <div className="ai-image"></div>
      </section>

      {/* GROWTH SECTION */}
      <section className="growth">
        <h2>Your Career Growth Accelerator</h2>
        <div className="growth-cards">
          <div className="growth-card">
            <h3>Launch your professional journey</h3>
            <p>Start your path with personalized guidance and insights.</p>
          </div>
          <div className="growth-card">
            <h3>Elevate your career trajectory</h3>
            <p>Gain tools and support for sustained professional growth.</p>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="services">
        <h2>Comprehensive Career Support</h2>
        <div className="cards">
          <div className="card">
            <h3>Strategic Career Counseling</h3>
            <p>Get expert advice for your professional direction.</p>
          </div>
          <div className="card">
            <h3>Skill Development Programs</h3>
            <p>Enhance your competencies with structured modules.</p>
          </div>
          <div className="card">
            <h3>Precision Job Opportunities</h3>
            <p>Discover job roles that match your aspirations.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <h2>Real Stories of Success</h2>
        <div className="testimonials-container">
          <div className="testimonial">
            <p>"The platform helped me find my perfect job path!"</p>
            <span>- Rahul Sharma</span>
          </div>
          <div className="testimonial">
            <p>"The AI insights boosted my learning curve!"</p>
            <span>- Neha Patel</span>
          </div>
          <div className="testimonial">
            <p>"Smart recommendations changed my career!"</p>
            <span>- Aarav Mehta</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">CareerAI</div>
          <p>Empowering your career with smart AI insights.</p>
        </div>
        <div className="footer-bottom">
          © 2025 CareerAI. All rights reserved.
        </div>
      </footer>

      {/* Hidden file input */}
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
    </div>
  );
}
