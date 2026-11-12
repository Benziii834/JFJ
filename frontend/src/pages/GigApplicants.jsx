import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

const filters = [
  { key: "ALL", label: "All" },
  { key: "APPLIED", label: "Pending" },
  { key: "SHORTLISTED", label: "Shortlisted" },
  { key: "REJECTED", label: "Rejected" },
];

function readWorker(app) {
  const w = app.worker || app.applicant || {};
  const id = w.userId || w.id || app.workerId || app.workerUserId || app.userId || null;
  const name = String(w.name || app.workerName || app.name || "Worker");

  const r = w.rating !== undefined ? w.rating : app.rating;
  let avg = null;
  let count = 0;
  if (r && typeof r === "object") {
    avg = r.average ?? null;
    count = r.count ?? 0;
  } else if (typeof r === "number") {
    avg = r;
  }

  const lv = w.level !== undefined ? w.level : app.level;
  let levelText = "";
  if (lv && typeof lv === "object") {
    levelText = "Lv " + lv.level + (lv.name ? " · " + lv.name : "");
  } else if (lv) {
    levelText = "Lv " + lv;
  }

  const skills = Array.isArray(w.skills)
    ? w.skills.map((s) => (typeof s === "string" ? s : s.name))
    : [];

  return { id, name, avg, count, levelText, skills };
}

function assignmentIdOf(app) {
  return app.assignmentId || (app.assignment && app.assignment.id) || null;
}

function WorkerLine({ w, onOpen }) {
  return (
    <div className="applicant-head">
      <div className="avatar-md">{w.name.charAt(0).toUpperCase()}</div>
      <div>
        <button className="name-link" onClick={onOpen}>
          {w.name}
        </button>
        <p className="meta">
          {w.avg !== null ? (
            <>
              <Stars value={w.avg} /> {Number(w.avg).toFixed(1)} ({w.count})
            </>
          ) : (
            "No ratings yet"
          )}
          {w.levelText ? " · " + w.levelText : ""}
        </p>
      </div>
    </div>
  );
}

function GigApplicants() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, mode, checking } = useAuth();

  const [gig, setGig] = useState(null);
  const [apps, setApps] = useState([]);
  const [sort, setSort] = useState("NEWEST");
  const [mainTab, setMainTab] = useState("APPLICANTS");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // worker profile popup
  const [profileFor, setProfileFor] = useState(null);
  const [wp, setWp] = useState(null);
  const [wReviews, setWReviews] = useState([]);
  const [profileError, setProfileError] = useState("");

  // contact popup
  const [contactFor, setContactFor] = useState(null);
  const [contact, setContact] = useState(null);
  const [contactError, setContactError] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    if (checking || !user || mode !== "PROVIDER") return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api("/gigs/" + id),
      api("/gigs/" + id + "/applications?page=0&size=50&sort=" + sort),
    ])
      .then(([g, a]) => {
        if (cancelled) return;
        setGig(g);
        setApps(Array.isArray(a) ? a : a.items || a.content || []);
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
  }, [id, sort, checking, user, mode, reloadKey]);

  async function act(app, path, successText) {
    setError("");
    setNotice("");
    setBusyId(app.id);
    try {
      await api("/applications/" + app.id + "/" + path, { method: "POST" });
      setNotice(successText);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  function hire(app, w) {
    if (!window.confirm("Hire " + w.name + " for this gig?")) return;
    act(app, "hire", w.name + " is hired 🎉");
  }

  function reject(app, w) {
    if (!window.confirm("Reject " + w.name + "?")) return;
    act(app, "reject", "Application rejected.");
  }

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

  function openContact(app) {
    setContactFor(app);
    setContact(null);
    setContactError("");
  }

  async function revealContact() {
    setContactLoading(true);
    setContactError("");
    try {
      const data = await api("/assignments/" + assignmentIdOf(contactFor) + "/contact");
      setContact(data);
    } catch (err) {
      setContactError(errorText(err));
    } finally {
      setContactLoading(false);
    }
  }

  if (mode && mode !== "PROVIDER") {
    return (
      <ProfileLayout title="Applicants">
        <p className="banner">
          Only Providers can see applicants. <Link to="/settings">Switch to Provider mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  const hired = apps.filter((a) => a.status === "HIRED");
  const applicantsAll = apps.filter((a) => a.status !== "HIRED" && a.status !== "WITHDRAWN");
  const applicants = applicantsAll.filter((a) => filter === "ALL" || a.status === filter);
  const canAct = !gig || !gig.status || gig.status === "OPEN";
  const gigStatus = gig ? statusInfo[gig.status] : null;

  return (
    <ProfileLayout title="Applicants">
      <div className="detail">
        <button className="back-btn" onClick={() => navigate("/manage-jobs")}>
          ← Back to Manage Jobs
        </button>

        {gig && (
          <div className="detail-head">
            <div className="thumb">💼</div>
            <div className="detail-title">
              <h2>{gig.title}</h2>
              <p>
                {hired.length} of {gig.workersNeeded} workers hired
                {gig.status ? " · " + gig.status.replace("_", " ").toLowerCase() : ""}
              </p>
            </div>
            {gigStatus && <span className={"badge " + gigStatus.cls}>{gigStatus.label}</span>}
          </div>
        )}

        {loading && <p className="muted">Loading... (first load can take a minute 😴)</p>}
        {error && <p className="banner">{error}</p>}
        {notice && <p className="success">{notice}</p>}

        <div className="tabs">
          <button
            className={mainTab === "APPLICANTS" ? "tab active" : "tab"}
            onClick={() => setMainTab("APPLICANTS")}
          >
            Applicants ({applicantsAll.length})
          </button>
          <button
            className={mainTab === "WORKERS" ? "tab active" : "tab"}
            onClick={() => setMainTab("WORKERS")}
          >
            Workers ({hired.length})
          </button>
        </div>

        {mainTab === "APPLICANTS" && (
          <div style={{ marginTop: "12px" }}>
            <div className="filter-row">
              {filters.map((f) => (
                <button
                  key={f.key}
                  className={filter === f.key ? "chip active" : "chip"}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
              <select
                className="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="NEWEST">Newest</option>
                <option value="RATING">Best rating</option>
                <option value="LEVEL">Highest level</option>
              </select>
            </div>

            {!loading && applicants.length === 0 && (
              <p className="empty">No applicants here yet.</p>
            )}

            {applicants.map((app) => {
              const w = readWorker(app);
              const status = statusInfo[app.status] || { label: app.status, cls: "withdrawn" };
              const busy = busyId === app.id;
              const open = app.status === "APPLIED" || app.status === "SHORTLISTED";
              return (
                <div className="applicant" key={app.id}>
                  <div className="applicant-top">
                    <WorkerLine w={w} onOpen={() => openProfile(w)} />
                    <span className={"badge " + status.cls}>{status.label}</span>
                  </div>

                  {w.skills.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      {w.skills.slice(0, 5).map((s) => (
                        <span className="skill-chip" key={s}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {app.note && <p className="note">“{app.note}”</p>}

                  {canAct && open && (
                    <div className="manage-actions" style={{ marginTop: "10px" }}>
                      {app.status === "APPLIED" && (
                        <button
                          className="small-btn"
                          disabled={busy}
                          onClick={() => act(app, "shortlist", "Shortlisted ✅")}
                        >
                          Shortlist
                        </button>
                      )}
                      <button
                        className="small-btn solid"
                        disabled={busy}
                        onClick={() => hire(app, w)}
                      >
                        Hire
                      </button>
                      <button
                        className="small-btn danger"
                        disabled={busy}
                        onClick={() => reject(app, w)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mainTab === "WORKERS" && (
          <div style={{ marginTop: "12px" }}>
            {!loading && hired.length === 0 && (
              <p className="empty">Nobody is hired yet. Hire someone from the Applicants tab.</p>
            )}
            {hired.map((app) => {
              const w = readWorker(app);
              return (
                <div className="applicant" key={app.id}>
                  <div className="applicant-top">
                    <WorkerLine w={w} onOpen={() => openProfile(w)} />
                    <span className="badge hired">Hired</span>
                  </div>
                  <div className="manage-actions" style={{ marginTop: "10px" }}>
                    {assignmentIdOf(app) && (
                      <button className="small-btn solid" onClick={() => openContact(app)}>
                        📞 Contact
                      </button>
                    )}
                    <button className="small-btn" onClick={() => openProfile(w)}>
                      View profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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

      {contactFor && (
        <div className="overlay" onClick={() => setContactFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Contact {readWorker(contactFor).name}</h2>

            {!contact && (
              <>
                <p className="muted">Before you call, stay safe:</p>
                <ul className="tips">
                  <li>Phone numbers are not verified.</li>
                  <li>Never pay money in advance.</li>
                  <li>Meet at the work location, not somewhere private.</li>
                </ul>
                {contactError && <p className="modal-error">{contactError}</p>}
                <button onClick={revealContact} disabled={contactLoading}>
                  {contactLoading ? "Loading..." : "Show contact details"}
                </button>
              </>
            )}

            {contact && (
              <>
                <p className="muted">{contact.name || readWorker(contactFor).name}</p>
                <p>
                  <a className="big-phone" href={"tel:" + contact.phone}>
                    {contact.phone}
                  </a>{" "}
                  <span className="unverified">Unverified</span>
                </p>
              </>
            )}

            <button className="secondary" onClick={() => setContactFor(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

export default GigApplicants;