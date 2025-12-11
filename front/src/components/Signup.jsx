import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import "./Modal.css";

// Regex rules
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function SignupModal({ close, openSignin }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // LIVE ERROR STATES
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passError, setPassError] = useState("");

  const passRules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const isPasswordValid =
    passRules.length &&
    passRules.upper &&
    passRules.lower &&
    passRules.digit &&
    passRules.special;

  // NAME LIVE VALIDATION
  useEffect(() => {
    if (fullName.trim().length === 0) setNameError("");
    else if (fullName.trim().length < 3)
      setNameError("Name must be at least 3 characters.");
    else setNameError("");
  }, [fullName]);

  // EMAIL LIVE VALIDATION
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!email) setEmailError("");
    else if (!email.includes("@"))
      setEmailError("Email must contain '@'");
    else if (!emailRegex.test(email))
      setEmailError("Invalid email format.");
    else setEmailError("");
  }, [email]);

  // PASSWORD LIVE VALIDATION
  useEffect(() => {
    if (!password) setPassError("");
    else if (!isPasswordValid)
      setPassError("Password does not meet security requirements.");
    else setPassError("");
  }, [password, isPasswordValid]);

  // Autofill fix
  useEffect(() => {
    setTimeout(() => {
      const nameInput = document.querySelector('input[placeholder="Full Name"]');
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');

      if (nameInput?.value) setFullName(nameInput.value);
      if (emailInput?.value) setEmail(emailInput.value);
      if (passInput?.value) setPassword(passInput.value);
    }, 400);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();

    // FINAL VALIDATION
    if (nameError || emailError || passError) {
      toast.error("Please fix errors before submitting.");
      return;
    }

    if (!fullName || !email || !password) {
      toast.error("All fields are required.");
      return;
    }

    if (!isPasswordValid) {
      toast.error("Password is too weak.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "/user/signup",
        { fullName, email, password },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.status === 201) {
        toast.success("Signup successful!");

        setTimeout(() => {
          if (typeof close === "function") close();
          if (typeof openSignin === "function") openSignin();
        }, 700);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Signup failed";
      toast.error(msg);

      if (err.response?.status === 409) {
        setTimeout(() => {
          if (typeof close === "function") close();
          if (typeof openSignin === "function") openSignin();
        }, 700);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderCheck = (flag) =>
    flag ? (
      <span style={{ color: "green", fontWeight: "bold" }}>✔</span>
    ) : (
      <span style={{ color: "red", fontWeight: "bold" }}>✘</span>
    );

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button
          className="close-btn"
          onClick={() => typeof close === "function" && close()}
        >
          ×
        </button>

        <div className="modal-left">
          Hello, Friend! Join us and start your journey.
        </div>

        <div className="modal-right">
          <h2>Sign Up</h2>

          <form onSubmit={handleSignup}>

            {/* FULL NAME */}
            <input
              type="text"
              placeholder="Full Name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            {nameError && <p className="error-text">{nameError}</p>}

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && <p className="error-text">{emailError}</p>}

            {/* PASSWORD */}
            <input
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passError && <p className="error-text">{passError}</p>}

            {/* PASSWORD CHECKLIST */}
            {password && (
              <div className="password-rules">
                <p>{renderCheck(passRules.length)} Min 8 characters</p>
                <p>{renderCheck(passRules.upper)} 1 uppercase letter</p>
                <p>{renderCheck(passRules.lower)} 1 lowercase letter</p>
                <p>{renderCheck(passRules.digit)} 1 number</p>
                <p>{renderCheck(passRules.special)} 1 special char (@$!%*?&)</p>
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          <p>
            Already have an account?{" "}
            <span
              className="link"
              onClick={() => {
                if (typeof close === "function") close();
                if (typeof openSignin === "function") openSignin();
              }}
            >
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
