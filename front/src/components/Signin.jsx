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
      const res = await fetch("/user/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 200) {
        toast.success("Login successful!");

        // ✅ Fetch user details for navbar
        try {
          const chk = await fetch("/user/check-login", { credentials: "include" });
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
        toast.error("User not registered. Please sign up first.");
        setTimeout(() => {
          close();
          openSignup();
        }, 800);
      } else if (res.status === 401) {
        toast.error("Incorrect password. Try again.");
      } else {
        toast.error(data.error || "Signin failed");
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
