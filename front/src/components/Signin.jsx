import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import "./Modal.css";

export default function SigninModal({ close, openSignup, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Sync browser autofill into React state
  useEffect(() => {
    setTimeout(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput?.value) setEmail(emailInput.value);
      if (passInput?.value) setPassword(passInput.value);
    }, 400);
  }, []);

  const handleSignin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/user/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 200) {
        toast.success("Welcome back! Login successful.", {
          style: {
            border: '1px solid #22d3a5',
            padding: '16px',
            color: '#22d3a5',
          },
          iconTheme: {
            primary: '#22d3a5',
            secondary: '#FFFAEE',
          },
        });

        // ✅ Clear previous user's cached data before loading new user's dashboard
        sessionStorage.clear();

        // ✅ Fetch user details for navbar
        try {
          const chk = await fetch("/api/user/check-login", { credentials: "include" });
          const chkData = await chk.json();
          if (chkData.loggedIn) {
            onLoginSuccess(chkData.user.fullName || chkData.user.email);
          } else {
            onLoginSuccess(email);
          }
        } catch {
          onLoginSuccess(email);
        }

        close();
      } else if (res.status === 404) {
        toast.error("Account not found. Please register to continue.", {
          style: {
            border: '1px solid #ff4d4f',
            padding: '16px',
            color: '#ff4d4f',
          },
        });
        setTimeout(() => {
          close();
          openSignup();
        }, 1200);
      } else if (res.status === 401) {
        toast.error("Invalid credentials. Please verify your password.", {
          style: {
            border: '1px solid #faad14',
            padding: '16px',
            color: '#faad14',
          },
        });
      } else {
        toast.error(data.error || "Authentication failed. Please try again.");
      }
    } catch (err) {
      console.error("Signin error:", err);
      toast.error("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="close-btn" onClick={close}>×</button>

        <div className="modal-left">{/* illustration or bg */}Welcome Back! Glad to see you again</div>

        <div className="modal-right">
          <h2>Login</h2>
          <form onSubmit={handleSignin}>
            <input
              type="email"
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p>
            Don’t have an account?{" "}
            <span className="link" onClick={() => { close(); openSignup(); }}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}
