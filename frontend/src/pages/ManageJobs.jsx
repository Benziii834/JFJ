import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

const statusInfo = {
  DRAFT: { label: "Draft", cls: "withdrawn" },
  OPEN: { label: "Active", cls: "shortlisted" },
  IN_PROGRESS: { label: "In progress", cls: "hired" },
  COMPLETED: { label: "Completed", cls: "hired" },
  CANCELLED: { label: "Cancelled", cls: "rejected" },
  EXPIRED: { label: "Expired", cls: "pending" },
};

const tabs = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "OPEN", label: "Active" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

function payLabel(type) {
  return type === "DAILY" ? "/ day" : type === "HOURLY" ? "/ hour" : "fixed";
}

function ManageJobs() {
  const navigate = useNavigate();
  const { user, mode, checking } = useAuth();
  
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [cancelGig, setCancelGig] = useState(null);
  const [reason, setReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (checking || !user || mode !== "PROVIDER") return;
    let cancelled = false;
    setLoading(true);
    api("/gigs/mine?page=0&size=50")
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
  }, [checking, user, mode, reloadKey]);

  // runs one action, shows the result, then reloads the list
  async function run(gig, successText, call) {
    setError("");
    setNotice("");
    setBusyId(gig.id);
    try {
      await call();
      setNotice(successText);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  function publish(gig) {
    run(gig, "Published ✅ Workers can see it now.", () =>
      api("/gigs/" + gig.id + "/publish", { method: "POST" })
    );
  }

  function start(gig) {
    if (!window.confirm("Start this gig? You need at least one hired worker.")) return;
    run(gig, "Gig started", () => api("/gigs/" + gig.id + "/start", { method: "POST" }));
  }

  function complete(gig) {
    if (!window.confirm("Mark this gig as completed? Workers will get XP.")) return;
    run(gig, "Gig completed. Don't forget to rate your workers.", () =>
      api("/gigs/" + gig.id + "/complete", { method: "POST" })
    );
  }

  function removeDraft(gig) {
    if (!window.confirm("Delete this draft for good?")) return;
    run(gig, "Draft deleted.", () => api("/gigs/" + gig.id, { method: "DELETE" }));
  }

  async function submitCancel() {
    const r = reason.trim();
    if (r.length < 5 || r.length > 500) {
      return setCancelError("Please give a reason (5 to 500 characters)");
    }
    setCancelError("");
    setBusyId(cancelGig.id);
    try {
      await api("/gigs/" + cancelGig.id + "/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: r }),
      });
      setCancelGig(null);
      setReason("");
      setNotice("Gig cancelled.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setCancelError(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  if (mode && mode !== "PROVIDER") {
    return (
      <ProfileLayout title="Manage Jobs">
        <p className="banner">
          Managing jobs is for Providers. <Link to="/settings">Switch to Provider mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  const visible = items.filter((g) => tab === "ALL" || g.status === tab);

  return (
    <ProfileLayout title="Manage Jobs">
      <div className="tabs">
        {tabs.map((t) => {
          const count =
            t.key === "ALL" ? items.length : items.filter((g) => g.status === t.key).length;
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
        <div className="list-head">
          <span className="muted">{items.length} gigs posted</span>
          <Link to="/post-job" className="inline-btn solid">
            + Post a New Job
          </Link>
        </div>

        {loading && <p className="muted">Loading... (first load can take a minute 😴)</p>}
        {error && <p className="banner">{error}</p>}
        {notice && <p className="success">{notice}</p>}

        {!loading && !error && visible.length === 0 && (
          <p className="empty">
            Nothing here yet. <Link to="/post-job">Post your first job →</Link>
          </p>
        )}

        {visible.map((gig) => {
          const status = statusInfo[gig.status] || { label: gig.status, cls: "withdrawn" };
          const busy = busyId === gig.id;
          const place = [gig.locality, gig.city].filter(Boolean).join(", ");
          return (
            <div className="app-card" key={gig.id}>
              <div className="thumb">💼</div>
              <div className="app-info">
                <h3>{gig.title}</h3>
                <p className="meta">
                  {gig.workersNeeded} slots · ₹{gig.payAmount} {payLabel(gig.payType)}
                </p>
                {place && <p className="meta">📍 {place}</p>}
              </div>
              <span className={"badge " + status.cls}>{status.label}</span>

              <div className="manage-actions">
                {gig.status === "DRAFT" && (
                  <>
                    <button className="small-btn solid" disabled={busy} onClick={() => publish(gig)}>
                      Publish
                    </button>
                    <button className="small-btn" onClick={() => navigate("/edit-job/" + gig.id)}>
                      Edit
                    </button>
                    <button className="small-btn danger" disabled={busy} onClick={() => removeDraft(gig)}>
                      Delete
                    </button>
                  </>
                )}

                {gig.status === "OPEN" && (
                  <>
                    <button className="small-btn solid" onClick={() => navigate("/manage-jobs/" + gig.id)}>
                      View Applicants
                    </button>
                    <button className="small-btn" onClick={() => navigate("/edit-job/" + gig.id)}>
                      Edit
                    </button>
                    <button className="small-btn" disabled={busy} onClick={() => start(gig)}>
                      Start
                    </button>
                    <button className="small-btn danger" disabled={busy} onClick={() => setCancelGig(gig)}>
                      Cancel
                    </button>
                  </>
                )}

                {gig.status === "IN_PROGRESS" && (
                  <>
                    <button className="small-btn solid" onClick={() => navigate("/manage-jobs/" + gig.id)}>
                      View Workers
                    </button>
                    <button className="small-btn" disabled={busy} onClick={() => complete(gig)}>
                      Complete
                    </button>
                    <button className="small-btn danger" disabled={busy} onClick={() => setCancelGig(gig)}>
                      Cancel
                    </button>
                  </>
                )}

                {gig.status === "COMPLETED" && (
                  <button className="small-btn solid" onClick={() => navigate("/manage-jobs/" + gig.id)}>
                    View Workers
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cancelGig && (
        <div className="overlay" onClick={() => setCancelGig(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Cancel this gig?</h2>
            <p className="muted">{cancelGig.title}</p>
            <textarea
              placeholder="Why are you cancelling? (5 to 500 characters)"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {cancelError && <p className="modal-error">{cancelError}</p>}
            <button onClick={submitCancel} disabled={busyId === cancelGig.id}>
              {busyId === cancelGig.id ? "Cancelling..." : "Cancel gig"}
            </button>
            <button className="secondary" onClick={() => setCancelGig(null)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

export default ManageJobs;