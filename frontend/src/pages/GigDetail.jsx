import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import Stars from "../components/Stars";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

// the map code only downloads when a gig page opens
const GigLocationMap = lazy(() => import("../components/GigLocationMap"));

function formatDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const levels = [
  { level: 1, name: "Newcomer", xp: 0 },
  { level: 2, name: "Trusted", xp: 60 },
  { level: 3, name: "Skilled", xp: 200 },
  { level: 4, name: "Pro", xp: 450 },
  { level: 5, name: "Expert", xp: 900 },
];

const experienceLabels = {
  BEGINNER: "Beginner+",
  INTERMEDIATE: "Intermediate+",
  EXPERIENCED: "Experienced",
};

function GigDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, mode, checking } = useAuth();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showApply, setShowApply] = useState(false);
  const [note, setNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applied, setApplied] = useState(false);
  const [showProvider, setShowProvider] = useState(false);
  const [provReviews, setProvReviews] = useState([]);
  const [provPage, setProvPage] = useState(0);
  const [provMore, setProvMore] = useState(false);
  const [provLoading, setProvLoading] = useState(false);
  const [provLoaded, setProvLoaded] = useState(false);

  useEffect(() => {
    if (checking || !user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api("/gigs/" + id)
      .then((data) => {
        if (!cancelled) setGig(data);
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
  }, [id, checking, user]);

  async function sendApplication() {
    setApplying(true);
    setApplyError("");
    try {
      await api("/gigs/" + id + "/applications", {
        method: "POST",
        body: JSON.stringify(note.trim() ? { note: note.trim() } : {}),
      });
      setApplied(true);
      setShowApply(false);
    } catch (err) {
      setApplyError(errorText(err));
    } finally {
      setApplying(false);
    }
  }

  if (loading || error || !gig) {
    return (
      <ProfileLayout title="Job Details">
        <div className="detail">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          {loading && <p className="muted">Loading gig... (first load can take a minute 😴)</p>}
          {error && <p className="banner">{error}</p>}
        </div>
      </ProfileLayout>
    );
  }

  const category =
    gig.category && typeof gig.category === "object"
      ? gig.category.name
      : gig.category || gig.categoryName;
  const provider = gig.provider || {};
  const ratingAvg = provider.rating ? provider.rating.average : null;
  const ratingCount = provider.rating ? provider.rating.count : 0;
  const providerLevel = provider.level ? provider.level.name : "";
  const pXp = provider.level?.totalXp ?? 0;
  const pNext = levels.find((l) => l.xp > pXp);
  const pCurrent = [...levels].reverse().find((l) => l.xp <= pXp) || levels[0];
  const pPercent = pNext
  ? Math.round(((pXp - pCurrent.xp) / (pNext.xp - pCurrent.xp)) * 100)
  : 100;
  async function loadProviderReviews(page) {
  if (!provider.id) {
    setProvLoaded(true);
    return;
  }
  setProvLoading(true);
  try {
    const data = await api(
      "/users/" + provider.id + "/reviews?page=" + page + "&size=20"
    );
    const list = Array.isArray(data) ? data : data.items || data.content || [];
    const mine = list.filter(
      (r) => !r.direction || r.direction === "WORKER_TO_PROVIDER"
    );
    setProvReviews((prev) => (page === 0 ? mine : [...prev, ...mine]));
    setProvPage(page);
    setProvMore(!Array.isArray(data) && page + 1 < (data.totalPages || 0));
  } catch {
    setProvMore(false);
  } finally {
    setProvLoading(false);
    setProvLoaded(true);
  }
}

function openProvider() {
  setShowProvider(true);
  if (!provLoaded) loadProviderReviews(0);
}
  const payLabel =
    gig.payType === "DAILY" ? "/ day" : gig.payType === "HOURLY" ? "/ hour" : "fixed";
  const skills = Array.isArray(gig.skills)
    ? gig.skills.map((s) => (typeof s === "string" ? s : s.name))
    : [];
  const place = [gig.locality, gig.city].filter(Boolean).join(", ");
  const isWorker = mode === "WORKER";
  const isOpen = !gig.status || gig.status === "OPEN";

  let applyButton;
  if (applied) {
    applyButton = <button className="apply-btn" disabled>Applied ✓</button>;
  } else if (!isWorker) {
    applyButton = <button className="apply-btn" disabled>Apply Now</button>;
  } else if (!isOpen) {
    applyButton = <button className="apply-btn" disabled>Not open</button>;
  } else {
    applyButton = (
      <button className="apply-btn" onClick={() => setShowApply(true)}>
        Apply Now
      </button>
    );
  }

  return (
    <ProfileLayout title="Job Details">
      <div className="detail">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="detail-head">
          <div className="thumb">💼</div>
          <div className="detail-title">
            <h2>{gig.title}</h2>
            <p>
              <span
                className="name-link"
                style={{ cursor: "pointer" }}
                onClick={openProvider}
              >
                {provider.name || "Provider"} ›
              </span>
            </p>
            <p>
              {ratingAvg != null ? (
                <>
                  <Stars value={ratingAvg} /> {ratingAvg} ({ratingCount} reviews)
                </>
              ) : (
                "No ratings yet"
              )}
              {providerLevel ? " · " + providerLevel : ""}
            </p>
          </div>
          {applyButton}
        </div>

        {applied && <p className="banner">Application sent! ✅ Track it in My Applications.</p>}
        {!isWorker && (
          <p className="hint">
            You are in Provider mode. <Link to="/settings">Switch to Worker mode</Link> to apply.
          </p>
        )}

        <Suspense fallback={<div className="map-box">Loading the map...</div>}>
          <GigLocationMap gig={gig} />
        </Suspense>

        <div className="card">
          <div className="fact"><span>💰</span> ₹{gig.payAmount} {payLabel}</div>
          {gig.durationText && <div className="fact"><span>⏱️</span> {gig.durationText}</div>}
          {gig.startDate && <div className="fact"><span>🗓️</span> Starts {formatDate(gig.startDate)}</div>}
          {gig.applyDeadline && <div className="fact"><span>⏳</span> Apply by {formatDate(gig.applyDeadline)}</div>}
          {gig.workersNeeded && <div className="fact"><span>👥</span> {gig.workersNeeded} workers needed</div>}
          {gig.minExperience && (
            <div className="fact">
              <span>🎓</span> {experienceLabels[gig.minExperience] || gig.minExperience}
            </div>
          )}
          {gig.minLevel && <div className="fact"><span>🏆</span> Level {gig.minLevel} or higher</div>}
          {category && <div className="fact"><span>🏷️</span> {category}</div>}
          {skills.length > 0 && (
            <div className="fact">
              <span>🛠️</span>
              <div>
                {skills.map((s) => (
                  <span className="skill-chip" key={s}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">About this gig</h3>
          <p className="muted">{gig.description}</p>
        </div>

        <div className="card">
          <h3 className="section-title">Location</h3>
          {place && <p className="muted">📍 {place}</p>}
          {gig.exact ? (
            <>
              <p className="hint">Full address</p>
              <p className="muted">
                🏠 {gig.exact.addressLine || gig.addressLine || "Not provided"}
              </p>
              <p className="hint">Provider phone number</p>
              <p className="muted">
                📞 {gig.exact.providerPhone || gig.providerPhone || "See My Jobs → Contact"}
              </p>
            </>
          ) : (
            <p className="muted">You get the exact address once you are hired.</p>
          )}
        </div>
      </div>

      {showApply && (
        <div className="overlay" onClick={() => setShowApply(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Apply for this gig</h2>
            <p className="muted">{gig.title}</p>
            <textarea
              placeholder="Add a note for the provider (optional)"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {applyError && (
              <p className="modal-error">
                {applyError}{" "}
                {applyError.toLowerCase().includes("profile") && (
                  <Link to="/profile">Go to my profile</Link>
                )}
              </p>
            )}
            <button onClick={sendApplication} disabled={applying}>
              {applying ? "Sending..." : "Send application"}
            </button>
            <button className="secondary" onClick={() => setShowApply(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

            {showProvider && (
        <div className="overlay" onClick={() => setShowProvider(false)}>
          <div className="modal tall provider-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>About this provider</h2>
            <div className="profile-head">
              <div className="avatar">🏢</div>
              <div>
                <h3>{provider.name || "Provider"}</h3>
                <span className="mode-badge">Provider</span>
              </div>
            </div>

            <div className="stats">
              <div className="stat-card">
                <span className="stat-num">
                  ⭐ {ratingAvg != null ? Number(ratingAvg).toFixed(1) : "—"} / 5
                </span>
                {ratingAvg != null ? ratingCount + " reviews" : "No ratings yet"}
              </div>
              <div className="stat-card">
                <span className="stat-num">🏆 {pXp} XP</span>
                Experience points
              </div>
            </div>

            <h3 className="section-title">
              Level {provider.level?.level ?? 1}
              {providerLevel ? " – " + providerLevel : ""}
            </h3>
            <div className="progress">
              <div className="progress-fill" style={{ width: pPercent + "%" }} />
            </div>
            <p className="muted">
              {pNext
                ? pXp + " / " + pNext.xp + " XP to reach Level " + pNext.level
                : "Top level reached 🎉"}
            </p>
            
            <h3 className="section-title">Reviews from workers</h3>
            {!provLoaded && <p className="muted">Loading reviews…</p>}
            {provLoaded && provReviews.length === 0 && (
              <p className="muted">No reviews yet.</p>
            )}
            {provReviews.map((r, i) => (
              <div className="review" key={r.id || i}>
                <Stars value={r.rating} />
                {r.comment && <p className="muted">“{r.comment}”</p>}
                <p className="hint">
                  {r.reviewerName || r.reviewer?.name || r.fromName || r.author?.name || ""}
                  {r.createdAt ? " · " + formatDate(r.createdAt) : ""}
                </p>
              </div>
            ))}
            {provMore && (
              <button
                className="secondary"
                disabled={provLoading}
                onClick={() => loadProviderReviews(provPage + 1)}
              >
                {provLoading ? "Loading…" : "Load more"}
              </button>
            )}

            <button className="secondary" onClick={() => setShowProvider(false)}>
              Close
            </button>
          </div>
        </div>
       )}

    </ProfileLayout>
  );
}

export default GigDetail;