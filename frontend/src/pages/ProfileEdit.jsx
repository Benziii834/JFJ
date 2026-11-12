import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

const baseLanguages = ["Assamese", "Hindi", "English", "Bengali", "Bodo", "Nepali", "Urdu"];

function toggle(list, value, max) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

function skillIdsFrom(profile, allSkills) {
  if (Array.isArray(profile.skillIds)) return profile.skillIds;
  if (!Array.isArray(profile.skills)) return [];
  return profile.skills
    .map((s) => {
      if (s && typeof s === "object") return s.id;
      const found = allSkills.find((x) => x.name === s);
      return found ? found.id : null;
    })
    .filter((id) => id !== null && id !== undefined);
}

function ProfileEdit() {
  const navigate = useNavigate();
  const { user, mode, checking } = useAuth();

  const [allSkills, setAllSkills] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [languages, setLanguages] = useState([]);
  const [years, setYears] = useState("0");
  const [level, setLevel] = useState("BEGINNER");
  const [skillIds, setSkillIds] = useState([]);
  const [missing, setMissing] = useState([]);
  const [complete, setComplete] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function fillForm(p, skillList) {
    setPhotoUrl(p.photoUrl || "");
    setDescription(p.description || "");
    setLanguages(Array.isArray(p.languages) ? p.languages : []);
    setYears(String(p.experienceYears ?? 0));
    setLevel(p.experienceLevel || "BEGINNER");
    setSkillIds(skillIdsFrom(p, skillList));
    setMissing(Array.isArray(p.missing) ? p.missing : []);
    setComplete(typeof p.profileComplete === "boolean" ? p.profileComplete : null);
  }

  useEffect(() => {
    if (checking || !user || mode !== "WORKER") return;
    let cancelled = false;
    setLoading(true);
    Promise.all([api("/skills"), api("/workers/me/profile")])
      .then(([skills, p]) => {
        if (cancelled) return;
        const list = Array.isArray(skills) ? skills : skills.items || [];
        setAllSkills(list);
        fillForm(p, list);
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

  async function save() {
    setError("");
    setMessage("");

    if (photoUrl.trim() && !/^https:\/\//i.test(photoUrl.trim())) {
      return setError("The photo link must start with https://");
    }
    const yearsNum = Number(years);
    if (isNaN(yearsNum) || yearsNum < 0 || yearsNum > 60) {
      return setError("Experience must be between 0 and 60 years");
    }

    const body = {
      languages,
      experienceYears: yearsNum,
      experienceLevel: level,
    };
    if (photoUrl.trim()) body.photoUrl = photoUrl.trim();
    if (description.trim()) body.description = description.trim();

    setSaving(true);
    try {
      await api("/workers/me/profile", { method: "PUT", body: JSON.stringify(body) });
      await api("/workers/me/skills", { method: "PUT", body: JSON.stringify({ skillIds }) });
      const fresh = await api("/workers/me/profile");
      fillForm(fresh, allSkills);
      setMessage("Profile saved ✅");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  if (mode && mode !== "WORKER") {
    return (
      <ProfileLayout title="Edit Profile">
        <p className="banner">
          Worker profiles are edited in Worker mode. <Link to="/settings">Switch to Worker mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  const langOptions = [...new Set([...baseLanguages, ...languages])];
  const validPhoto = /^https:\/\//i.test(photoUrl.trim());

  return (
    <ProfileLayout title="Edit Profile">
      <div className="detail edit-form">
        <button className="back-btn" onClick={() => navigate("/profile")}>
          ← Back to profile
        </button>

        {loading && <p className="muted">Loading... (first load can take a minute 😴)</p>}
        {error && <p className="banner">{error}</p>}
        {message && <p className="success">{message}</p>}
        {!loading && complete === false && missing.length > 0 && (
          <p className="banner">Still needed before you can apply: {missing.join(", ")}</p>
        )}
        {!loading && complete === true && (
          <p className="success">Your profile is complete ✅ You can apply to gigs.</p>
        )}

        <div className="card">
          <h3 className="section-title">Photo</h3>
          {validPhoto && <img className="photo-preview" src={photoUrl.trim()} alt="Preview" />}
          <label>Photo link (must start with https://)</label>
          <input
            type="text"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
        </div>

        <div className="card">
          <h3 className="section-title">About me</h3>
          <textarea
            placeholder="Tell providers about yourself and your work..."
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="hint">{description.length} / 1000</p>
        </div>

        <div className="card">
          <h3 className="section-title">Languages (up to 5)</h3>
          <div className="chip-wrap">
            {langOptions.map((l) => (
              <button
                key={l}
                type="button"
                className={languages.includes(l) ? "chip active" : "chip"}
                onClick={() => setLanguages(toggle(languages, l, 5))}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Experience</h3>
          <label>Years of experience</label>
          <input
            type="number"
            min="0"
            max="60"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
          <label>Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERIENCED">Experienced</option>
          </select>
        </div>

        <div className="card">
          <h3 className="section-title">Skills (up to 10)</h3>
          <div className="chip-wrap">
            {allSkills.map((s) => (
              <button
                key={s.id}
                type="button"
                className={skillIds.includes(s.id) ? "chip active" : "chip"}
                onClick={() => setSkillIds(toggle(skillIds, s.id, 10))}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <button className="btn" onClick={save} disabled={saving || loading}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </ProfileLayout>
  );
}

export default ProfileEdit;