import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import Stars from "../components/Stars";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

const statusInfo = {
  APPLIED: { label: "Pending", cls: "pending" },
  SHORTLISTED: { label: "Shortlisted", cls: "shortlisted" },
  HIRED: { label: "Hired", cls: "hired" },
  REJECTED: { label: "Rejected", cls: "rejected" },
};

const statusIcon = { APPLIED: "⏳", SHORTLISTED: "⭐", HIRED: "💼", REJECTED: "✖" };
const avatarColors = ["#3b5bdb", "#7048e8", "#1c7ed6", "#12b886", "#f08c00", "#e64980"];

// same name always gets the same avatar color
function avatarColor(name) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return avatarColors[sum % avatarColors.length];
}

function readWorker(app) {
  const w = app.worker || app.applicant || {};
  const id = w.userId || w.id || app.workerId || app.workerUserId || app.userId || null;
  const name = String(w.name || app.workerName || app.name || "Worker");
  const r = w.rating !== undefined ? w.rating : app.rating;
  const avg = r && typeof r === "object" ? r.average ?? null : typeof r === "number" ? r : null;
  const count = r && typeof r === "object" ? r.count ?? 0 : 0;
  return { id, name, avg, count };
}

function AllApplicants() {
  const { user, mode, checking } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // worker profile popup
  const [profileFor, setProfileFor] = useState(null);
  const [wp, setWp] = useState(null);
  const [wReviews, setWReviews] = useState([]);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (checking || !user || mode !== "PROVIDER") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const mine = await api("/gigs/mine?page=0&size=50");
        const gigs = (Array.isArray(mine) ? mine : mine.items || []).filter(
          (g) => g.status !== "DRAFT"
        );
        const perGig = await Promise.all(
          gigs.map(async (g) => {
            const gid = g.id || g.gigId;
            try {
              const a = await api("/gigs/" + gid + "/applications?page=0&size=50");
              const list = Array.isArray(a) ? a : a.items || a.content || [];
              return list
                .filter((x) => x.status !== "WITHDRAWN")
                .map((app) => ({ app, gigId: gid, gigTitle: g.title }));
            } catch {
              return [];
            }
          })
        );
        const t = (r) => new Date(r.app.createdAt || r.app.appliedAt || 0).getTime();
        const all = perGig.flat().sort((a, b) => t(b) - t(a));
        if (!cancelled) setRows(all);
      } catch (err) {
        if (!cancelled) setError(errorText(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [checking, user, mode]);

  function openProfile(w) {
    setProfileFor(w);
    setWp(null);
    setWReviews([]);
    setProfileError("");
    if (!w.id) {
      setProfileError("No profile available for this worker.");
      return;
    }
    api("/workers/" + w.id)
      .then(setWp)
      .catch((err) => setProfileError(errorText(err)));
    api("/users/" + w.id + "/reviews")
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items || d.content || [];
        setWReviews(
          list.filter((r) => !r.direction || r.direction === "PROVIDER_TO_WORKER").slice(0, 5)
        );
      })
      .catch(() => setWReviews([]));
  }

  if (mode && mode !== "PROVIDER") {
    return (
      <ProfileLayout title="View Applicants">
        <p className="banner">
          Only Providers can see applicants. <Link to="/settings">Switch to Provider mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => {
  if (!q) return true;
  const w = readWorker(r.app);
  return (
    w.name.toLowerCase().includes(q) ||
    String(r.gigTitle || "").toLowerCase().includes(q)
  );
});

  return (
    <ProfileLayout title="View Applicants">
      <div className="detail">
        {loading && <p className="muted">Loading... (first load can take a minute 😴)</p>}
        {error && <p className="banner">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="empty">Nobody has applied to your gigs yet.</p>
        )}

        {!loading && rows.length > 0 && (
        <div className="ap-toolbar">
          <p className="hint">{rows.length} applicants across your gigs</p>
          <input
            className="ap-search"
            type="text"
            placeholder="🔍 Search applicants or gigs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

        {shown.map((r) => {
        const w = readWorker(r.app);
        const status = statusInfo[r.app.status] || { label: r.app.status, cls: "withdrawn" };
        return (
          <div
            className="ap-row"
            key={r.gigId + "-" + r.app.id}
            onClick={() => openProfile(w)}
          >
            <div className="ap-avatar" style={{ background: avatarColor(w.name) }}>
              {w.name.charAt(0).toUpperCase()}
            </div>
            <div className="ap-info">
              <p className="ap-name">{w.name}</p>
              <p className="ap-gig">
                Applied for:{" "}
                <Link
                  to={"/manage-jobs/" + r.gigId}
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.gigTitle || "Untitled gig"}
                </Link>
              </p>
            </div>
            <span className={"badge " + status.cls}>
              {(statusIcon[r.app.status] || "•") + " " + status.label}
            </span>
            <span className="ap-arrow">›</span>
          </div>
          );
          })}
          {!loading && rows.length > 0 && shown.length === 0 && (
          <p className="empty">No applicants match your search.</p>
          )}
      </div>

      {profileFor && (
        <div className="overlay" onClick={() => setProfileFor(null)}>
          <div className="modal tall worker-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>{profileFor.name}</h2>
            {profileError && <p className="modal-error">{profileError}</p>}
            {!wp && !profileError && <p className="muted">Loading...</p>}

            {wp && (
              <>
                {wp.photoUrl && /^https:\/\//i.test(wp.photoUrl) && (
                  <img className="photo-preview" src={wp.photoUrl} alt="Worker" />
                )}
                {wp.description && <p className="muted">{wp.description}</p>}
                <p className="muted">
                  {wp.experienceYears != null ? wp.experienceYears + " years" : ""}
                  {wp.experienceLevel ? " · " + wp.experienceLevel.toLowerCase() : ""}
                </p>
                {Array.isArray(wp.languages) && wp.languages.length > 0 && (
                  <p className="muted">🗣️ {wp.languages.join(", ")}</p>
                )}
                {Array.isArray(wp.skills) &&
                  wp.skills.map((s) => {
                    const name = typeof s === "string" ? s : s.name;
                    return (
                      <span className="skill-chip" key={name}>
                        {name}
                      </span>
                    );
                  })}
              </>
            )}

            <h3 className="section-title" style={{ marginTop: "12px" }}>
              Reviews
            </h3>
            {wReviews.length === 0 && <p className="muted">No reviews yet.</p>}
            {wReviews.map((r, i) => (
              <div className="review" key={r.id || i}>
                <Stars value={r.rating} />
                {r.comment && <p className="muted">“{r.comment}”</p>}
              </div>
            ))}

            <button className="secondary" onClick={() => setProfileFor(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

export default AllApplicants;