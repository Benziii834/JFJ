import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileLayout from "../components/ProfileLayout";
import GigCard from "../components/GigCard";
import { useAuth } from "../AuthContext";
import { api, errorText } from "../api";

// the map code only downloads when someone opens Map View
const GigMap = lazy(() => import("../components/GigMap"));

const startFilters = { q: "", categoryId: "", radiusKm: "10", payType: "" };

function Explore() {
  const navigate = useNavigate();
  const { user, checking } = useAuth();

  const [view, setView] = useState("list"); // list or map
  const [geo, setGeo] = useState("asking"); // asking, ready, denied
  const [coords, setCoords] = useState(null);
  const [categories, setCategories] = useState([]);

  const [draft, setDraft] = useState(startFilters); // what you are typing/choosing
  const [applied, setApplied] = useState(startFilters); // what was actually applied
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // 1. ask the browser where you are (only used to sort by distance)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("ready");
      },
      () => setGeo("denied"),
      { timeout: 8000 }
    );
  }, []);

  // 2. load the category list for the dropdown
  useEffect(() => {
    if (checking || !user) return;
    api("/categories")
      .then((data) => setCategories(Array.isArray(data) ? data : data.items || []))
      .catch(() => setCategories([]));
  }, [checking, user]);

  // 3. load gigs whenever the filters, page or location change
  useEffect(() => {
    if (geo === "asking" || checking || !user) return;

    const controller = new AbortController();
    const slowTimer = setTimeout(() => setSlow(true), 3000);
    setLoading(true);
    setSlow(false);
    setError("");

    const params = new URLSearchParams();
    if (coords && applied.radiusKm !== "any") {
      params.set("lat", coords.lat.toFixed(6));
      params.set("lng", coords.lng.toFixed(6));
      params.set("radiusKm", applied.radiusKm);
    }
    if (applied.q.trim()) params.set("q", applied.q.trim());
    if (applied.categoryId) params.set("categoryId", applied.categoryId);
    if (applied.payType) params.set("payType", applied.payType);
    params.set("page", page);
    params.set("size", 10);

    api("/gigs?" + params.toString(), { signal: controller.signal })
      .then((data) => {
        const list = data.items || [];
        setItems((old) => (page === 0 ? list : [...old, ...list]));
        setTotalItems(data.totalItems ?? list.length);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(errorText(err));
      })
      .finally(() => {
        clearTimeout(slowTimer);
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [applied, coords, geo, page, reloadKey, checking, user]);

  function setField(name, value) {
    setDraft({ ...draft, [name]: value });
  }

  function applyFilters() {
    setPage(0);
    setApplied({ ...draft });
    setShowFilters(false);
  }

  // the map uses the same filters as the list (but its own area instead of distance)
  const mapParams = new URLSearchParams();
  if (applied.q.trim()) mapParams.set("q", applied.q.trim());
  if (applied.categoryId) mapParams.set("categoryId", applied.categoryId);
  if (applied.payType) mapParams.set("payType", applied.payType);
  const mapFilterQuery = mapParams.toString();

  return (
    <ProfileLayout title="Explore Jobs">
      <div className="searchrow">
        <input
          type="text"
          placeholder="Search jobs..."
          value={draft.q}
          onChange={(e) => setField("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters();
          }}
        />
        <button
          type="button"
          className="filter-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          ⚙️
        </button>
        <button
          type="button"
          className="map-btn"
          onClick={() => setView(view === "list" ? "map" : "list")}
        >
          {view === "list" ? "📍 Map View" : "📋 List View"}
        </button>
      </div>

      <div className="explore-grid">
        <aside className={showFilters ? "filters show" : "filters"}>
          <h3 className="section-title">Filters</h3>

          <label>Category</label>
          <select
            value={draft.categoryId}
            onChange={(e) => setField("categoryId", e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {view === "list" && (
            <>
              <label>Location</label>
              <select
                value={coords ? draft.radiusKm : "any"}
                disabled={!coords}
                onChange={(e) => setField("radiusKm", e.target.value)}
              >
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="50">Within 50 km</option>
                <option value="any">Anywhere</option>
              </select>
              {!coords && geo === "denied" && (
                <p className="hint">Turn on location in your browser to filter by distance.</p>
              )}
            </>
          )}

          <label>Pay Type</label>
          <select value={draft.payType} onChange={(e) => setField("payType", e.target.value)}>
            <option value="">Any</option>
            <option value="DAILY">Daily</option>
            <option value="HOURLY">Hourly</option>
            <option value="FIXED">Fixed</option>
          </select>

          <button className="btn" onClick={applyFilters}>
            Apply Filters
          </button>
        </aside>

        <section className="results">
          {view === "map" ? (
            <div style={{ padding: "12px 16px 0" }}>
              <Suspense fallback={<p className="link">Loading the map...</p>}>
                <GigMap filterQuery={mapFilterQuery} />
              </Suspense>
            </div>
          ) : (
            <>
              <div className="countrow">
                <h2>{loading && page === 0 ? "Loading gigs..." : totalItems + " gigs found"}</h2>
                <span>
                  {coords && applied.radiusKm !== "any" ? "Nearest first" : "Newest first"}
                </span>
              </div>

              {slow && loading && (
                <p className="banner">
                  Waking up the server, the first load can take up to a minute 😴
                </p>
              )}

              {error && (
                <p className="banner">
                  {error}{" "}
                  <button className="chip" onClick={() => setReloadKey(reloadKey + 1)}>
                    Retry
                  </button>
                </p>
              )}

              <main>
                {!loading && !error && items.length === 0 && (
                  <p className="empty">
                    No gigs found 😢 Try "Anywhere" in Location, or a bigger radius.
                  </p>
                )}
                {items.map((gig) => (
                  <GigCard key={gig.id} gig={gig} onClick={() => navigate("/gigs/" + gig.id)} />
                ))}
              </main>

              {page + 1 < totalPages && (
                <button
                  className="btn secondary"
                  disabled={loading}
                  onClick={() => setPage(page + 1)}
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </ProfileLayout>
  );
}

export default Explore;