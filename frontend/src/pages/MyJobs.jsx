import { iconFor } from "../components/GigCard";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

// the backend field names aren't confirmed yet, so we read them defensively
function titleOf(j) {
  return j.gigTitle || (j.gig && j.gig.title) || j.title || "Gig";
}
function categoryOf(j) {
  const c = j.category || (j.gig && j.gig.category);
  return c && typeof c === "object" ? c.name : c;
}
function reviewIdOf(j) {
  return j.myReviewId || j.reviewId || (j.myReview && j.myReview.id) ||
    (j.review && j.review.id) || null;
}
function badgeClass(status) {
  if (status === "ACTIVE") return "badge hired";
  if (status === "COMPLETED") return "badge shortlisted";
  return "badge rejected";
}

function MyJobs() {
  const { user, mode, checking } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [contact, setContact] = useState(null);

  const [reviewJob, setReviewJob] = useState(null); // { job, editing }
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (checking || !user || mode !== "WORKER") return;
    let cancelled = false;
    setLoading(true);
    api("/assignments/mine?page=0&size=50")
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items || d.content || [];
        if (!cancelled) setJobs(list);
      })
      .catch((e) => { if (!cancelled) setError(errorText(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [checking, user, mode, reload]);

  function openContact(j) {
    setContact({ title: titleOf(j), loading: true });
    api("/assignments/" + j.id + "/contact")
      .then((d) =>
        setContact({ title: titleOf(j), name: d.name, phone: d.phone, until: d.availableUntil })
      )
      .catch((e) => setContact({ title: titleOf(j), error: errorText(e) }));
  }

  function openReview(j, editing) {
    setRating(5);
    setComment("");
    setReviewError("");
    setReviewJob({ job: j, editing });
  }

  async function submitReview() {
    setSaving(true);
    setReviewError("");
    try {
      const body = JSON.stringify({ rating, comment: comment.trim() || undefined });
      if (reviewJob.editing) {
        await api("/reviews/" + reviewIdOf(reviewJob.job), { method: "PUT", body });
      } else {
        await api("/assignments/" + reviewJob.job.id + "/reviews", { method: "POST", body });
      }
      setReviewJob(null);
      setReload((n) => n + 1);
    } catch (e) {
      setReviewError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  if (mode && mode !== "WORKER") {
    return (
      <ProfileLayout title="My Jobs">
        <p className="banner">
          My Jobs is for Workers. <Link to="/settings">Switch mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout title="My Jobs">
      <div className="detail">
        {loading && <p className="link">Loading your jobs...</p>}
        {error && <p className="banner">{error}</p>}
        {!loading && !error && jobs.length === 0 && (
          <p className="empty">No jobs yet. Get hired on a gig first 😭</p>
        )}

        {jobs.map((j) => {
          const reviewOpen = j.reviewOpenUntil && new Date(j.reviewOpenUntil) > new Date();
          return (
              <div className="app-card" key={j.id}>
              <div className="thumb">{iconFor(categoryOf(j))}</div>
              <div className="app-info">
                <h3>{titleOf(j)}</h3>
                {categoryOf(j) && <p className="meta">{categoryOf(j)}</p>}
                <span className={badgeClass(j.status)}>{j.status}</span>
              </div>
              <div className="app-side">
                {j.status !== "REMOVED" && (
                  <button className="small-btn" onClick={() => openContact(j)}>Contact</button>
                )}
                {j.status === "COMPLETED" && !j.reviewedByMe && (
                  <button className="small-btn solid" onClick={() => openReview(j, false)}>
                    Review
                  </button>
                )}
                {j.status === "COMPLETED" && j.reviewedByMe && (
                  <span className="muted">Reviewed ✓</span>
                )}
                {j.reviewedByMe && reviewOpen && reviewIdOf(j) && (
                  <button className="small-btn" onClick={() => openReview(j, true)}>
                    Edit review
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {contact && (
        <div className="overlay" onClick={() => setContact(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{contact.title}</h3>
            {contact.loading && <p className="muted">Loading...</p>}
            {contact.error && <p className="modal-error">{contact.error}</p>}
            {contact.phone && (
              <>
                <p className="hint">Name</p>
                <p><b>{contact.name}</b></p>
                <p className="hint">Phone number 📞</p>
                <p className="big-phone">{contact.phone}</p>
                <a className="inline-btn solid" href={"tel:" + contact.phone}>Call now</a>
                {contact.until && (
                  <p className="hint">Available until {new Date(contact.until).toLocaleDateString()}</p>
                )}
              </>
            )}
            <button className="secondary" onClick={() => setContact(null)}>Close</button>
          </div>
        </div>
      )}

      {reviewJob && (
        <div className="overlay" onClick={() => setReviewJob(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{reviewJob.editing ? "Edit review" : "Rate"}: {titleOf(reviewJob.job)}</h3>
            <div className="edit-form">
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} ★</option>
                ))}
              </select>
              <label>Comment (optional)</label>
              <textarea
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            {reviewError && <p className="modal-error">{reviewError}</p>}
            <button onClick={submitReview} disabled={saving}>
              {saving ? "Saving..." : "Submit"}
            </button>
            <button className="secondary" onClick={() => setReviewJob(null)}>Cancel</button>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

export default MyJobs;