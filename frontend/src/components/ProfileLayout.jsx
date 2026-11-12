import { useState } from "react";
import { NavLink, Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const workerLinks = [
  { to: "/profile", label: "My Profile", icon: "👤" },
  { to: "/", label: "Find Jobs", icon: "🔍" },
  { to: "/my-applications", label: "My Applications", icon: "💼" },
  { to: "/my-jobs", label: "My Jobs", icon: "🛠️" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

const providerLinks = [
  { to: "/profile", label: "My Business Profile", icon: "🏢" },
  { to: "/post-job", label: "Post a Job", icon: "➕" },
  { to: "/manage-jobs", label: "Manage Jobs", icon: "💼" },
  { to: "/applicants", label: "View Applicants", icon: "👥" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

function ProfileLayout({ title, children }) {
  const { user, mode, checking, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (checking) {
    return <p className="link">Checking your session... (first load can take a minute 😴)</p>;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }

  const isProvider = mode === "PROVIDER";
  const links = isProvider ? providerLinks : workerLinks;
  const initial = (user.name || "?").charAt(0).toUpperCase();
  const levelText = user.level && user.level.level ? " · Lv " + user.level.level : "";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <h1 className="logo">JFJ</h1>
        {links.map((l) => (
          <NavLink
            key={l.label}
            to={l.to}
            end
            className="side-link"
            onClick={() => setOpen(false)}
          >
            <span>{l.icon}</span> {l.label}
          </NavLink>
        ))}
        <button className="side-link logout" onClick={handleLogout}>
        <span>🚪</span> Logout
        </button>
      </aside>

      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <div className="content">
        <div className="content-top">
          <button className="menu-btn" onClick={() => setOpen(true)}>☰</button>
          <h2>{title}</h2>
          <div className="top-right">
            <span className="mode-pill">
              {isProvider ? "Provider" : "Worker"}
              {levelText}
            </span>
            <Link to="/notifications" className="icon-btn">🔔</Link>
            <Link to="/profile" className="avatar-sm">{initial}</Link>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default ProfileLayout;