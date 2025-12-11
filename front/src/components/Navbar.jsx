import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SigninModal from "./Signin";
import SignupModal from "./Signup";
import "./Home.css";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [showSignin, setShowSignin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("/user/logout", { credentials: "include" });
      setUser(null);
      toast.success("Logged out");
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
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
          style={{ cursor: "pointer" }} 
          onClick={() => navigate("/")}
        >
          CareerAI
        </div>

        <ul className="nav-links">
          <li onClick={() => navigate("/")}>Overview</li>
          <li onClick={() => navigate("/")}>Jobs</li>
          {user && (
            <li 
              onClick={() => navigate("/dashboard")}
              style={{ color: "royalblue", fontWeight: "bold" }}
            >
              📊 Dashboard
            </li>
          )}
          <li>AI Hub</li>
          <li>Resources</li>
        </ul>

        <div className="nav-buttons">
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
