import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import Stars from "../components/Stars";
import { useAuth } from "../AuthContext";
import { api } from "../api";

const levels = [
  { level: 1, name: "Newcomer", xp: 0 },
  { level: 2, name: "Trusted", xp: 60 },
  { level: 3, name: "Skilled", xp: 200 },
  { level: 4, name: "Pro", xp: 450 },
  { level: 5, name: "Expert", xp: 900 },
];

function formatDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Profile() {
  const { user, mode, checking, switchMode } = useAuth();
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [wp, setWp] = useState(null);
  const [counts, setCounts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [waiting, setWaiting] = useState(null);
  const [rateTarget, setRateTarget] = useState(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [rateError, setRateError] = useState("");
  const [saving, setSaving] = useState(false);
  const isProvider = mode === "PROVIDER";

  useEffect(() => {
    if (!user?.id) return;
    api("/users/" + user.id + "/reviews")
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.content || [];
        setReviews(list);
      })
      .catch(() => setReviews([]));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || mode !== "WORKER") {
      setWp(null);
      return;
    }
    api("/workers/me/profile")
      .then(setWp)
      .catch(() => setWp(null));
  }, [user?.id, mode]);

  // provider gig counts + 5 latest gigs
  useEffect(() => {
    if (checking || !user || mode !== "PROVIDER") {
      setCounts(null);
      setRecent([]);
      return;
    }
    let cancelled = false;
    const total = (data) => (data && data.totalItems) || 0;
    Promise.all([
      api("/gigs/mine?size=1"),
      api("/gigs/mine?status=OPEN&size=1"),
      api("/gigs/mine?status=IN_PROGRESS&size=1"),
      api("/gigs/mine?status=COMPLETED&size=1"),
      api("/gigs/mine?page=0&size=10"),
    ])
      .then(([all, open, progress, done, latest]) => {
        if (cancelled) return;
        setCounts({
          posted: total(all),
          open: total(open),
          inProgress: total(progress),
          completed: total(done),
        });
        setRecent(latest && Array.isArray(latest.items) ? latest.items : []);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [checking, user, mode]);

  // completed gigs that still have workers waiting for my rating
  useEffect(() => {
    if (checking || !user || mode !== "PROVIDER") {
      setWaiting(null);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const done = await api("/gigs/mine?status=COMPLETED&page=0&size=20");
        const gigs = done && Array.isArray(done.items) ? done.items : [];
        const results = await Promise.all(
          gigs.map(async (g) => {
            const gid = g.id || g.gigId;
            try {
              const p = await api("/gigs/" + gid + "/reviews/pending");
              const list = Array.isArray(p) ? p : p.items || p.content || [];
              return { id: gid, title: g.title, workers: list };
            } catch {
              return { id: gid, title: g.title, workers: [] };
            }
          })
        );
        if (!cancelled) setWaiting(results.filter((r) => r.workers.length > 0));
      } catch {
        if (!cancelled) setWaiting([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [checking, user, mode]);

  // reads a pending worker defensively (backend field names may differ)
function workerInfo(w) {
  return {
    assignmentId: w.assignmentId || w.id,
    name: w.workerName || w.worker?.name || w.name || "Worker",
  };
}

function openRate(gigId, worker) {
  setRateTarget({ gigId, worker });
  setStars(5);
  setComment("");
  setRateError("");
}

async function submitRating() {
  setSaving(true);
  setRateError("");
  try {
    await api("/assignments/" + workerInfo(rateTarget.worker).assignmentId + "/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: stars, comment: comment.trim() || undefined }),
    });
    // remove that worker from the list; drop the gig if nobody is left
    setWaiting((prev) =>
      prev
        .map((g) =>
          g.id === rateTarget.gigId
            ? { ...g, workers: g.workers.filter((x) => x !== rateTarget.worker) }
            : g
        )
        .filter((g) => g.workers.length > 0)
    );
    setRateTarget(null);
  } catch (err) {
    setRateError(err.message);
  } finally {
    setSaving(false);
  }
}

  async function handleSwitch() {
    setError("");
    try {
      await switchMode();
    } catch (err) {
      setError(err.message);
    }
  }

  // rating depends on which role you are in
  const ratingObj = isProvider ? user?.providerRating : user?.workerRating;
  const rating = ratingObj && ratingObj.average != null ? ratingObj.average : null;
  const ratingCount = ratingObj ? ratingObj.count : 0;

  // level and XP progress
  const xp = user?.level?.totalXp ?? 0;
  const levelNumber = user?.level?.level ?? 1;
  const levelName = user?.level?.name ?? "";
  const next = levels.find((l) => l.xp > xp);
  const current = [...levels].reverse().find((l) => l.xp <= xp) || levels[0];
  const percent = next ? Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100) : 100;

  // reviews for the role you are in
  const wanted = isProvider ? "WORKER_TO_PROVIDER" : "PROVIDER_TO_WORKER";
  const myReviews = reviews.filter((r) => !r.direction || r.direction === wanted);

  const skillNames =
    wp && Array.isArray(wp.skills)
      ? wp.skills.map((s) => (typeof s === "string" ? s : s.name))
      : [];
  const languages = wp && Array.isArray(wp.languages) ? wp.languages : [];
  const photo = wp && wp.photoUrl && /^https:\/\//i.test(wp.photoUrl) ? wp.photoUrl : null;

  return (
    <ProfileLayout title={isProvider ? "Provider Profile" : "Worker Profile"}>
      <div className="profile-card">
        <div className="profile-head">
          <div className="avatar">
            {photo ? <img src={photo} alt="Profile" /> : isProvider ? "🏢" : "🧑"}
          </div>
          <div>
            <h2>{user?.name}</h2>
            <span className="mode-badge">{isProvider ? "Provider" : "Worker"}</span>
            <p>✉️ {user?.email}</p>
            {user?.city && <p>📍 {user.city}</p>}
          </div>
        </div>
        {!isProvider && (
          <Link to="/profile/edit" className="btn link-btn edit-btn">
            ✏️ Edit Profile
          </Link>
        )}
      </div>

      {!isProvider && wp && wp.profileComplete === false && (
        <p className="banner">
          Your profile is not complete yet
          {Array.isArray(wp.missing) && wp.missing.length > 0
            ? " (missing: " + wp.missing.join(", ") + ")"
            : ""}
          . <Link to="/profile/edit">Complete it</Link> to start applying.
        </p>
      )}

      <div className="stats">
        <div className="stat-card">
          <span className="stat-num">
            ⭐ {rating !== null ? Number(rating).toFixed(1) : "—"} / 5
          </span>
          <Stars value={rating ?? 0} />
          {rating !== null ? ratingCount + " reviews" : "No ratings yet"}
        </div>
        <div className="stat-card">
          <span className="stat-num">🏆 {xp} XP</span>
          Experience points
        </div>
      </div>

      <div className="profile-card">
        <h3 className="section-title">
          Level {levelNumber}
          {levelName ? " – " + levelName : ""}
        </h3>
        <div className="progress">
          <div className="progress-fill" style={{ width: percent + "%" }} />
        </div>
        <p className="muted">
          {next
            ? xp + " / " + next.xp + " XP to reach Level " + next.level
            : "Top level reached 🎉"}
        </p>
      </div>

      {isProvider ? (
        <div className="profile-card">
          <h3 className="section-title">About our business</h3>
          <p className="muted">Business profile editing is coming after the demo 🛠️</p>
        </div>
      ) : (
        <>
          <div className="profile-card">
            <h3 className="section-title">About me</h3>
            <p className="muted">
              {wp && wp.description
                ? wp.description
                : "Add a description in Edit Profile so providers get to know you."}
            </p>
          </div>

          <div className="profile-card">
            <h3 className="section-title">Skills</h3>
            {skillNames.length === 0 && <p className="muted">No skills added yet.</p>}
            {skillNames.map((s) => (
              <span className="skill-chip" key={s}>
                {s}
              </span>
            ))}
            {languages.length > 0 && (
              <>
                <h3 className="section-title" style={{ marginTop: "12px" }}>
                  Languages
                </h3>
                {languages.map((l) => (
                  <span className="skill-chip" key={l}>
                    {l}
                  </span>
                ))}
              </>
            )}
          </div>
        </>
      )}

      <div className="profile-card">
        <h3 className="section-title">Reviews &amp; Feedback</h3>
        {myReviews.length === 0 && <p className="muted">No reviews yet.</p>}
        <div className="scroll-list scroll-reviews">
        {myReviews.map((r, i) => (
          <div className="review" key={r.id || i}>
            <Stars value={r.rating} />
            {(r.gigTitle || r.gig?.title) && (
              <p className="hint">For: {r.gigTitle || r.gig?.title}</p>
            )}
            {r.comment && <p className="muted">“{r.comment}”</p>}
            <p className="hint">
              {r.reviewerName || r.reviewer?.name || r.fromName || r.author?.name || ""}
              {r.createdAt ? " · " + formatDate(r.createdAt) : ""}
            </p>
          </div>
        ))}
        </div>
      </div>

      {isProvider ? (
        <>
          <div className="profile-card">
            <h3 className="section-title">
              Gigs waiting for my ratings{" "}
              {waiting && waiting.length > 0 && (
                <span className="badge pending">{waiting.length}</span>
              )}
            </h3>
            {waiting === null && <p className="muted">Checking…</p>}
            {waiting && waiting.length === 0 && (
              <p className="muted">
                All caught up 🎉 Nobody is waiting for your rating.
              </p>
            )}
            {waiting &&
            waiting.map((g) => (
            <div key={g.id}>
              <p>
                <Link to={"/manage-jobs/" + g.id} className="name-link">
                  {g.title || "Untitled gig"}
                </Link>
              </p>
              {g.workers.map((w, i) => {
                const info = workerInfo(w);
                return (
                  <div className="row" key={info.assignmentId || i}>
                    <span>{info.name}</span>
                    <button className="small-btn solid" onClick={() => openRate(g.id, w)}>
                      Rate ⭐
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          </div>

          <div className="profile-card">
            <h3 className="section-title">My Gigs</h3>
            {counts === null ? (
              <p className="muted">Loading your gig numbers…</p>
            ) : (
              <>
                <div className="row">
                  <span>Total posted</span>
                  <strong>{counts.posted}</strong>
                </div>
                <div className="row">
                  <span>Open</span>
                  <strong>{counts.open}</strong>
                </div>
                <div className="row">
                  <span>In progress</span>
                  <strong>{counts.inProgress}</strong>
                </div>
                <div className="row">
                  <span>Completed</span>
                  <strong>{counts.completed}</strong>
                </div>
              </>
            )}
          </div>

          <div className="profile-card">
            <h3 className="section-title">Recent gigs</h3>
            {counts !== null && recent.length === 0 && (
              <p className="muted">No gigs yet. Post your first one below 👇</p>
            )}
            <div className="scroll-list scroll-gigs">
            {recent.map((g, i) => {
              const gid = g.id || g.gigId;
              return (
                <div className="row" key={gid || i}>
                  <span>
                    {gid ? (
                      <Link to={"/manage-jobs/" + gid} className="name-link">
                        {g.title || "Untitled gig"}
                      </Link>
                    ) : (
                      g.title || "Untitled gig"
                    )}
                    <br />
                    <span className="hint">
                      {g.createdAt ? formatDate(g.createdAt) : ""}
                    </span>
                  </span>
                  <strong>
                    {g.status ? String(g.status).replace("_", " ") : ""}
                  </strong>
                </div>
              );
            })}
            </div>
          
            {recent.length > 0 && (
              <Link to="/manage-jobs" className="link">
                See all in Manage Jobs →
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="profile-card">
          <h3 className="section-title">My Job Activity</h3>
          <div className="row">
            <span>Applied jobs</span>
            <strong>0</strong>
          </div>
          <div className="row">
            <span>Accepted applications</span>
            <strong>0</strong>
          </div>
          <div className="row">
            <span>Pending applications</span>
            <strong>0</strong>
          </div>
        </div>
      )}

      {isProvider && (
        <Link to="/post-job" className="btn link-btn">
          + Post a New Job
        </Link>
      )}

        {rateTarget && (
        <div className="overlay" onClick={() => setRateTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">Rate {workerInfo(rateTarget.worker).name}</h3>
            <div className="edit-form">
            <label>Rating</label>
            <select value={stars} onChange={(e) => setStars(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
              <textarea
                rows="3"
                maxLength={500}
                placeholder="Comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            {rateError && <p className="modal-error">{rateError}</p>}
            <button disabled={saving} onClick={submitRating}>
              {saving ? "Saving…" : "Submit rating"}
            </button>
            <button className="secondary" onClick={() => setRateTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <p id="error">{error}</p>
      <button className="btn secondary" onClick={handleSwitch}>
        Switch to {isProvider ? "Worker" : "Provider"} mode
      </button>
    </ProfileLayout>
  );
}

export default Profile;