import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import { useAuth } from "../AuthContext";
import { errorText } from "../api";

function Settings() {
  const { mode, switchMode, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const isProvider = mode === "PROVIDER";

  async function handleSwitch() {
    setError("");
    try {
      await switchMode();
      navigate("/profile");
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function comingSoon() {
    alert("Coming soon 🛠️");
  }

  return (
    <ProfileLayout title="Settings">
      <div className="profile-card">
        <button className="setting-row" onClick={comingSoon}>
          <span>👤</span> Account Settings
        </button>
        <button className="setting-row" onClick={comingSoon}>
          <span>🔒</span> Change Password
        </button>
        <button className="setting-row" onClick={handleSwitch}>
          <span>🔁</span> Switch to {isProvider ? "Worker" : "Provider"}
        </button>
      </div>

      <p id="error">{error}</p>

      <button className="btn danger" onClick={handleLogout}>
        Log Out
      </button>
    </ProfileLayout>
  );
}

export default Settings;