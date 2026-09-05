// src/components/Sidebar.jsx — Career Intelligence Platform Navigation
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { checkLogin } from "../auth";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "⚡", label: "Dashboard",        shortLabel: "Home"    },
  { path: "/profile",   icon: "🧠", label: "Profile Intelligence", shortLabel: "Profile" },
  { path: "/jobs",      icon: "🎯", label: "Tech Job Match",    shortLabel: "Jobs"    },
  { path: "/skills",    icon: "📊", label: "Skill Gap & Tests", shortLabel: "Skills"  },
  { path: "/roadmap",   icon: "🗺️", label: "Roadmap",           shortLabel: "Roadmap" },
  { path: "/chat",      icon: "🤖", label: "AI Assistant",      shortLabel: "AI"      },
];

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkLogin().then(d => { if (d.loggedIn) setUser(d.user); });
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await fetch("/api/user/logout", { credentials: "include" });
    } catch (_) {}
    sessionStorage.clear(); // Clear all cached user data
    toast.success("Logged out successfully");
    navigate("/");
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
    <aside className="ca-sidebar" style={{ ...styles.sidebar, width: collapsed ? 72 : 240 }}>
      {/* Logo */}
      <div style={styles.logo} onClick={() => navigate("/dashboard")}>
        <span style={styles.logoIcon}>⚡</span>
        {!collapsed && <span style={styles.logoText}>CareerAI</span>}
      </div>

      {/* Collapse toggle */}
      <button style={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "▶" : "◀"}
      </button>

      {/* Navigation */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path ||
            (item.path === "/dashboard" && location.pathname === "/");
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.navItem,
                ...(active ? styles.navItemActive : {}),
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              title={collapsed ? item.label : ""}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
              {active && !collapsed && <span style={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div style={styles.userSection}>
        {user && (
          <div style={{ ...styles.userCard, padding: collapsed ? "10px 0" : "12px 16px" }}>
            <div style={styles.avatar}>{initials}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.userName}>{user.fullName?.split(" ")[0] || "User"}</div>
                <div style={styles.userEmail}>{user.email?.slice(0, 20)}...</div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogoutClick}
          style={{ ...styles.logoutBtn, justifyContent: collapsed ? "center" : "flex-start" }}
          title={collapsed ? "Logout" : ""}
        >
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalIcon}>🚪</div>
            <h3 style={styles.modalTitle}>Confirm Logout</h3>
            <p style={styles.modalText}>Are you sure you want to end your session?</p>
            <div style={styles.modalActions}>
              <button onClick={() => setShowLogoutConfirm(false)} style={styles.modalBtnCancel}>
                Cancel
              </button>
              <button onClick={confirmLogout} style={styles.modalBtnConfirm}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Mobile bottom navigation
export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="ca-mobilenav" style={styles.mobileNav}>
      {NAV_ITEMS.map(item => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ ...styles.mobileNavItem, ...(active ? styles.mobileNavItemActive : {}) }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{item.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  sidebar: {
    position: "fixed", top: 0, left: 0, bottom: 0,
    background: "#f5f6f8",
    display: "flex", flexDirection: "column",
    transition: "width 0.25s ease",
    zIndex: 100,
    overflow: "hidden",
    boxShadow: "4px 0 20px rgba(0,0,0,0.3)",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "24px 20px 16px",
    cursor: "pointer",
  },
  logoIcon: { fontSize: 28, flexShrink: 0 },
  logoText: {
    fontSize: 22, fontWeight: 800, color: "#fff",
    background: "linear-gradient(135deg, #f59e0b, #f59e0b)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    whiteSpace: "nowrap",
  },
  collapseBtn: {
    margin: "0 8px 8px", padding: "6px",
    background: "rgba(17,24,39,0.06)", border: "none",
    borderRadius: 6, color: "#4b5563", cursor: "pointer",
    fontSize: 12, transition: "all 0.2s",
  },
  nav: { flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" },
  navItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 12px", borderRadius: 10,
    border: "none", background: "transparent",
    color: "#4b5563", cursor: "pointer",
    fontSize: 14, fontWeight: 500,
    width: "100%", textAlign: "left",
    transition: "all 0.15s",
    position: "relative",
  },
  navItemActive: {
    background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.15))",
    color: "#111827",
    borderLeft: "3px solid #f59e0b",
  },
  navIcon: { fontSize: 20, flexShrink: 0 },
  navLabel: { whiteSpace: "nowrap", overflow: "hidden" },
  activeIndicator: {
    position: "absolute", right: 12,
    width: 6, height: 6, borderRadius: "50%",
    background: "#f59e0b",
  },
  userSection: { padding: "8px", borderTop: "1px solid rgba(17,24,39,0.1)" },
  userCard: {
    display: "flex", alignItems: "center", gap: 10,
    borderRadius: 10, marginBottom: 4,
  },
  avatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #f59e0b, #f59e0b)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden" },
  userEmail: { fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden" },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 8,
    border: "none", background: "transparent",
    color: "#ef4444", cursor: "pointer",
    fontSize: 13, fontWeight: 500, width: "100%",
    transition: "background 0.15s",
  },
  mobileNav: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: "#f5f6f8",
    display: "none",
    justifyContent: "space-around",
    padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
    borderTop: "1px solid rgba(17,24,39,0.12)",
    zIndex: 100,
  },
  mobileNavItem: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "6px 12px", border: "none", background: "transparent",
    color: "#6b7280", cursor: "pointer", borderRadius: 8,
  },
  mobileNavItemActive: { color: "#f59e0b" },
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
    animation: "fadeIn 0.2s ease-out",
  },
  modalContent: {
    background: "#ffffff",
    border: "1px solid rgba(17,24,39,0.12)",
    borderRadius: 20, padding: 32, width: "90%", maxWidth: 400,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
  },
  modalIcon: {
    fontSize: 48, marginBottom: 16,
    background: "rgba(239, 68, 68, 0.1)",
    width: 80, height: 80, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modalTitle: {
    margin: "0 0 12px", fontSize: 24, fontWeight: 700, color: "#111827",
  },
  modalText: {
    margin: "0 0 24px", fontSize: 15, color: "#4b5563", textAlign: "center", lineHeight: 1.5,
  },
  modalActions: {
    display: "flex", gap: 12, width: "100%", justifyContent: "center",
  },
  modalBtnCancel: {
    flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600,
    background: "#ffffff", color: "#4b5563", border: "1px solid rgba(17,24,39,0.2)",
    cursor: "pointer", transition: "all 0.2s",
  },
  modalBtnConfirm: {
    flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontWeight: 600,
    background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none",
    cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
  },
};

// Inject simple keyframes for fade in if they don't exist
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `;
  document.head.appendChild(style);
}
