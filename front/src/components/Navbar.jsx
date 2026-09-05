// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SigninModal from "./Signin";
import SignupModal from "./Signup";
import { checkLogin, clearCachedSession } from "../auth";
import "./Home.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [showSignin, setShowSignin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in on component mount
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    const auth = await checkLogin();
    if (auth.loggedIn && auth.user) {
      setUser(auth.user.fullName || auth.user.email);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/user/logout", { credentials: "include" });
      clearCachedSession();
      setUser(null);
      toast.success("Logged out");
      navigate("/");
    } catch {
      clearCachedSession();
      setUser(null);
      navigate("/");
    }
  };

  const handleDashboardClick = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      toast.error("Please login first");
      setShowSignin(true);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div 
          className="logo" 
          style={{ cursor: "pointer", zIndex: 101 }} 
          onClick={() => navigate("/")}
        >
          CareerAI
        </div>

        {/* Desktop Menu */}
        <ul className={`nav-links ${mobileMenuOpen ? "force-show" : ""}`}>
          <li onClick={() => { navigate("/"); setMobileMenuOpen(false); }}>Overview</li>
          <li onClick={() => { navigate("/"); setMobileMenuOpen(false); }}>Jobs</li>
          <li onClick={() => { navigate("/chat"); setMobileMenuOpen(false); }}>AI Career Mentor</li>
          <li onClick={() => { setMobileMenuOpen(false); }}>Resources</li>
          
          {/* Mobile Only Buttons inside Menu */}
          <div className="mobile-nav-buttons">
            {user ? (
                <>
                  <span className="username-mobile">Hi, {user}</span>
                  <button onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}>
                    📊 Dashboard
                  </button>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</button>
                </>
            ) : (
                <>
                  <button onClick={() => { setShowSignup(true); setMobileMenuOpen(false); }}>Register</button>
                  <button onClick={() => { setShowSignin(true); setMobileMenuOpen(false); }}>Login</button>
                </>
            )}
          </div>
        </ul>

        {/* Desktop Buttons (Hidden on Mobile) */}
        <div className="nav-buttons desktop-only">
          {user ? (
            <>
              <span className="username">{user}</span>
              <button 
                className="resume-nav"
                onClick={handleDashboardClick}
              >
                📊 Dashboard
              </button>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowSignup(true)}>Register</button>
              <button onClick={() => setShowSignin(true)}>Login</button>
            </>
          )}
        </div>

        {/* Hamburger Icon */}
        <div className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                    <path d="M3 12h18M3 6h18M3 18h18" />
                )}
            </svg>
        </div>
      </nav>

      {/* Sign In Modal */}
      {showSignin && (
        <SigninModal
          close={() => setShowSignin(false)}
          openSignup={() => {
            setShowSignin(false);
            setShowSignup(true);
          }}
          onLoginSuccess={(name) => {
            setUser(name);
            setShowSignin(false);
            navigate("/dashboard"); // ✅ Auto redirect to dashboard
          }}
        />
      )}

      {/* Sign Up Modal */}
      {showSignup && (
        <SignupModal
          close={() => setShowSignup(false)}
          openSignin={() => {
            setShowSignup(false);
            setShowSignin(true);
          }}
        />
      )}
    </>
  );
}
