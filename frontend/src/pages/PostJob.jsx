import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

// the map code only downloads when this page opens
const LocationPicker = lazy(() => import("../components/LocationPicker"));

const levelNames = ["Newcomer", "Trusted", "Skilled", "Pro", "Expert"];

const startForm = {
  title: "",
  categoryId: "",
  description: "",
  payType: "DAILY",
  payAmount: "",
  workersNeeded: "1",
  startDate: "",
  durationText: "",
  applyDeadline: "",
  minExperience: "",
  minLevel: "",
  addressLine: "",
  locality: "",
  city: "",
};

function toggle(list, value, max) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

// fills an address box only if it is empty (or when we are allowed to overwrite)
function pickValue(oldValue, newValue, overwrite) {
  return (overwrite || !oldValue) && newValue ? newValue : oldValue;
}

function PostJob() {
  const navigate = useNavigate();
  const { user, mode, checking } = useAuth();

  const [form, setForm] = useState(startForm);
  const [skillIds, setSkillIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allSkills, setAllSkills] = useState([]);

  const [pin, setPin] = useState(null); // {lat, lng}
  const [focusKey, setFocusKey] = useState(0); // goes up when the map should fly to the pin
  const [confirmed, setConfirmed] = useState(false);
  const [pickedLabel, setPickedLabel] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchDown, setSearchDown] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const [locating, setLocating] = useState(false);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

  // load categories and skills
  useEffect(() => {
    if (checking || !user) return;
    api("/categories")
      .then((d) => setCategories(Array.isArray(d) ? d : d.items || []))
      .catch(() => setCategories([]));
    api("/skills")
      .then((d) => setAllSkills(Array.isArray(d) ? d : d.items || []))
      .catch(() => setAllSkills([]));
  }, [checking, user]);

  // address suggestions: wait 300 ms, need 3+ letters, cancel old requests
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3 || searchDown) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api("/geo/autocomplete?q=" + encodeURIComponent(q), { signal: controller.signal })
        .then((data) => {
          setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
          setSearchHint("");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          if (err.status === 429) {
            setSearchHint("Too many searches, slow down a little. You can also use your current location.");
          } else if (err.status === 503) {
            setSearchDown(true);
          }
          setSuggestions([]);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, searchDown]);

  function setField(name, value) {
    setForm({ ...form, [name]: value });
  }

  function fillAddress(a, overwrite) {
    setForm((prev) => ({
      ...prev,
      addressLine: pickValue(prev.addressLine, a.addressLine, overwrite),
      locality: pickValue(prev.locality, a.locality, overwrite),
      city: pickValue(prev.city, a.city, overwrite),
    }));
  }

  function chooseSuggestion(s) {
    setPin({ lat: s.lat, lng: s.lng });
    setFocusKey((k) => k + 1);
    setConfirmed(false);
    setPickedLabel(s.label);
    fillAddress(s, true);
    setSearch("");
    setSuggestions([]);
  }

  // the pin was tapped or dragged on the map
  async function pickOnMap(p) {
    setPin(p);
    setConfirmed(false);
    setPickedLabel("Pin on the map");
    try {
      const a = await api("/geo/reverse?lat=" + p.lat.toFixed(6) + "&lng=" + p.lng.toFixed(6));
      fillAddress(a, false);
      if (a.label) setPickedLabel(a.label);
    } catch (err) {
      // no address found is normal in small towns, you can type it yourself
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      return setError("Your browser cannot share its location. Search for the address instead.");
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPin({ lat, lng });
        setFocusKey((k) => k + 1);
        setConfirmed(false);
        setPickedLabel("Your current location");
        try {
          const a = await api("/geo/reverse?lat=" + lat.toFixed(6) + "&lng=" + lng.toFixed(6));
          fillAddress(a, false);
        } catch (err) {
          // no address found is normal in small towns, you can type it yourself
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Location permission was denied. Search for the address instead.");
      },
      { timeout: 8000 }
    );
  }

  async function submit(publish) {
    setError("");

    if (form.title.trim() === "") return setError("Please enter a job title");
    if (form.title.trim().length > 100) return setError("Title can be at most 100 characters");
    if (form.categoryId === "") return setError("Please choose a category");
    if (form.description.trim() === "") return setError("Please describe the job");
    if (!/^\d+(\.\d{1,2})?$/.test(form.payAmount) || Number(form.payAmount) <= 0) {
      return setError("Pay must be a number with at most 2 decimals");
    }
    const workers = Number(form.workersNeeded);
    if (!Number.isInteger(workers) || workers < 1 || workers > 50) {
      return setError("Workers needed must be between 1 and 50");
    }
    if (form.startDate === "") return setError("Please pick a start date");
    if (form.startDate < today) return setError("Start date cannot be in the past");
    if (form.durationText.trim() === "") return setError("Please enter the duration, like 2 days");
    if (form.applyDeadline && form.applyDeadline > form.startDate) {
      return setError("Apply deadline must be on or before the start date");
    }
    if (!pin) return setError("Choose a location: tap the map, search an address or use your current location");
    if (pin.lat < 6 || pin.lat > 38 || pin.lng < 68 || pin.lng > 98) {
      return setError("That pin is outside India. Move it onto the map of India.");
    }
    if (!confirmed) return setError("Please tap Confirm location first");
    if (form.addressLine.trim() === "") return setError("Please enter the address line");
    if (form.locality.trim() === "") return setError("Please enter the locality");
    if (form.city.trim() === "") return setError("Please enter the city");

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: Number(form.categoryId),
      payType: form.payType,
      payAmount: Number(form.payAmount),
      workersNeeded: workers,
      startDate: form.startDate,
      durationText: form.durationText.trim(),
      skillIds,
      lat: Number(pin.lat.toFixed(6)),
      lng: Number(pin.lng.toFixed(6)),
      addressLine: form.addressLine.trim(),
      locality: form.locality.trim(),
      city: form.city.trim(),
    };
    if (form.minExperience) body.minExperience = form.minExperience;
    if (form.applyDeadline) body.applyDeadline = form.applyDeadline;
    if (form.minLevel) body.minLevel = Number(form.minLevel);

    setBusy(publish ? "publish" : "draft");
    try {
      const gig = await api("/gigs", { method: "POST", body: JSON.stringify(body) });
      if (publish) {
        try {
          await api("/gigs/" + gig.id + "/publish", { method: "POST" });
        } catch (err) {
          setError("Saved as a draft, but publishing failed: " + errorText(err));
          return;
        }
      }
      alert(publish ? "Job published ✅" : "Draft saved ✅");
      navigate("/manage-jobs");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  }

  if (mode && mode !== "PROVIDER") {
    return (
      <ProfileLayout title="Post a Job">
        <p className="banner">
          Posting jobs is for Providers. <Link to="/settings">Switch to Provider mode</Link>
        </p>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout title="Post a Job">
      <div className="detail edit-form">
        {error && <p className="banner">{error}</p>}

        <div className="card">
          <h3 className="section-title">Basics</h3>
          <label>Job title</label>
          <input
            type="text"
            maxLength={100}
            placeholder="e.g. Web Development Help"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
          <label>Category</label>
          <select value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label>Description</label>
          <textarea
            maxLength={2000}
            placeholder="Tell us more about the job..."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>

        <div className="card">
          <h3 className="section-title">Pay</h3>
          <label>Pay type</label>
          <select value={form.payType} onChange={(e) => setField("payType", e.target.value)}>
            <option value="DAILY">Daily</option>
            <option value="HOURLY">Hourly</option>
            <option value="FIXED">Fixed</option>
          </select>
          <label>Amount (₹)</label>
          <input
            type="text"
            placeholder="e.g. 600"
            value={form.payAmount}
            onChange={(e) => setField("payAmount", e.target.value)}
          />
          <label>Workers needed (1 to 50)</label>
          <input
            type="number"
            min="1"
            max="50"
            value={form.workersNeeded}
            onChange={(e) => setField("workersNeeded", e.target.value)}
          />
        </div>

        <div className="card">
          <h3 className="section-title">Schedule</h3>
          <label>Start date</label>
          <input
            type="date"
            min={today}
            value={form.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
          />
          <label>Duration</label>
          <input
            type="text"
            placeholder="e.g. 2 days"
            value={form.durationText}
            onChange={(e) => setField("durationText", e.target.value)}
          />
          <label>Apply deadline (optional)</label>
          <input
            type="date"
            min={today}
            value={form.applyDeadline}
            onChange={(e) => setField("applyDeadline", e.target.value)}
          />
        </div>

        <div className="card">
          <h3 className="section-title">Requirements (optional)</h3>
          <label>Minimum experience</label>
          <select value={form.minExperience} onChange={(e) => setField("minExperience", e.target.value)}>
            <option value="">Anyone</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERIENCED">Experienced</option>
          </select>
          <label>Minimum level</label>
          <select value={form.minLevel} onChange={(e) => setField("minLevel", e.target.value)}>
            <option value="">Any level</option>
            {levelNames.map((n, i) => (
              <option key={n} value={i + 1}>
                Level {i + 1} – {n}
              </option>
            ))}
          </select>
          <label>Skills needed (up to 10)</label>
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

        <div className="card">
          <h3 className="section-title">Location</h3>

          {!searchDown && (
            <>
              <label>Search the address</label>
              <input
                type="text"
                placeholder="Type 3+ letters, e.g. Zoo Road Guwahati"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searchHint && <p className="hint">{searchHint}</p>}
              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s, i) => (
                    <button
                      type="button"
                      className="suggestion"
                      key={i}
                      onClick={() => chooseSuggestion(s)}
                    >
                      📍 {s.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {searchDown && (
            <p className="hint">Address search is not available right now. Tap the map and type the address.</p>
          )}

          <div className="row-actions">
            <button type="button" className="inline-btn" onClick={locateMe} disabled={locating}>
              {locating ? "Finding you..." : "📍 Use my current location"}
            </button>
          </div>

          <Suspense fallback={<div className="map-box">Loading the map...</div>}>
            <LocationPicker pin={pin} focusKey={focusKey} onPick={pickOnMap} />
          </Suspense>
          <p className="hint">Tap the map to drop the pin, then drag it to fine-tune.</p>

          {pin && (
            <p className="muted" style={{ marginTop: "10px" }}>
              Pin set: {pickedLabel || "chosen location"}
            </p>
          )}

          <label>Address line</label>
          <input
            type="text"
            placeholder="House no, lane"
            value={form.addressLine}
            onChange={(e) => setField("addressLine", e.target.value)}
          />
          <label>Locality</label>
          <input
            type="text"
            placeholder="e.g. Zoo Road"
            value={form.locality}
            onChange={(e) => setField("locality", e.target.value)}
          />
          <label>City</label>
          <input
            type="text"
            placeholder="e.g. Guwahati"
            value={form.city}
            onChange={(e) => setField("city", e.target.value)}
          />
          <p className="hint">The map fills these boxes only when they are empty, so your typing is never overwritten.</p>

          <div className="row-actions">
            <button
              type="button"
              className={confirmed ? "inline-btn solid" : "inline-btn"}
              disabled={!pin}
              onClick={() => setConfirmed(true)}
            >
              {confirmed ? "Location confirmed ✅" : "Confirm location"}
            </button>
          </div>
          {!pin && <p className="hint">Pick a place first, then confirm it.</p>}
        </div>

        <button className="btn secondary" disabled={busy !== ""} onClick={() => submit(false)}>
          {busy === "draft" ? "Saving..." : "Save as draft"}
        </button>
        <button className="btn" disabled={busy !== ""} onClick={() => submit(true)}>
          {busy === "publish" ? "Publishing..." : "Publish Job"}
        </button>
      </div>
    </ProfileLayout>
  );
}

export default PostJob;