import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

const statusInfo = {
  APPLIED: { label: "Pending", cls: "pending" },
  SHORTLISTED: { label: "Shortlisted", cls: "shortlisted" },
  HIRED: { label: "Hired", cls: "hired" },
  REJECTED: { label: "Rejected", cls: "rejected" },
  WITHDRAWN: { label: "Withdrawn", cls: "withdrawn" },
};

const tabs = [
  { key: "ALL", label: "All" },
  { key: "APPLIED", label: "Pending" },
  { key: "SHORTLISTED", label: "Shortlisted" },
  { key: "HIRED", label: "Hired" },
  { key: "REJECTED", label: "Rejected" },
];

function formatDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function readApp(app) {
  const gig = app.gig || {};
  return {
    gigId: gig.id || app.gigId,
    title: gig.title || app.gigTitle || app.title || "Gig",
    provider:
      (gig.provider && gig.provider.name) || app.providerName || gig.providerName || "",
    appliedAt: app.appliedAt || app.createdAt,
  };
}

function MyApplications() {
  const navigate = useNavigate();
  const { user, mode, checking } = useAuth();

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (checking || !user || mode !== "WORKER") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api("/applications/mine?page=0&size=50")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.content || [];
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checking, user, mode]);

  async function withdraw(app) {
    if (!window.confirm("Withdraw this application?")) return;
    try {
      await api("/applications/" + app.id, { method: "DELETE" });
      setItems(items.map((a) => (a.id === app.id ? { ...a, status: "WITHDRAWN" } : a)));
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (mode && mode !== "WORKER") {
    return (
      <ProfileLayout title="My Applications">
        <p className="banner">
          Applications are for Workers. <Link to="/settings">Switch to Worker mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  const visible = items.filter((a) => tab === "ALL" || a.status === tab);

  return (
    <ProfileLayout title="My Applications">
      <div className="tabs">
        {tabs.map((t) => {
          const count =
            t.key === "ALL" ? items.length : items.filter((a) => a.status === t.key).length;
          return (
            <button
              key={t.key}
              className={tab === t.key ? "tab active" : "tab"}
              onClick={() => setTab(t.key)}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="app-list">
        {loading && <p className="muted">Loading... (first load can take a minute 😴)</p>}
        {error && <p className="banner">{error}</p>}

        {!loading && !error && visible.length === 0 && (
          <p className="empty">
            Nothing here yet. <Link to="/">Find jobs →</Link>
          </p>
        )}

        {visible.map((app) => {
          const info = readApp(app);
          const status = statusInfo[app.status] || { label: app.status, cls: "withdrawn" };
          const canWithdraw = app.status === "APPLIED" || app.status === "SHORTLISTED";
          return (
            <div className="app-card" key={app.id}>
              <div className="thumb">💼</div>
              <div className="app-info">
                <h3>{info.title}</h3>
                {info.provider && <p className="meta">{info.provider}</p>}
                {info.appliedAt && <p className="meta">Applied on: {formatDate(info.appliedAt)}</p>}
              </div>
              <div className="app-side">
                <span className={"badge " + status.cls}>{status.label}</span>
                {info.gigId && (
                  <button className="small-btn" onClick={() => navigate("/gigs/" + info.gigId)}>
                    View
                  </button>
                )}
                {canWithdraw && (
                  <button className="small-btn danger" onClick={() => withdraw(app)}>
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ProfileLayout>
  );
}

export default MyApplications;