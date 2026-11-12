export function iconFor(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("paint")) return "🎨";
  if (n.includes("clean")) return "🧹";
  if (n.includes("deliver")) return "📦";
  if (n.includes("construct")) return "🧱";
  if (n.includes("event")) return "🎪";
  if (n.includes("cook") || n.includes("kitchen")) return "🍳";
  if (n.includes("garden")) return "🌿";
  if (n.includes("driv")) return "🚗";
  return "💼";
}

function GigCard({ gig, onClick }) {
  const category =
    gig.category && typeof gig.category === "object" ? gig.category.name : gig.category;
  const payLabel =
    gig.payType === "DAILY" ? "/ day" : gig.payType === "HOURLY" ? "/ hour" : "fixed";
  const place = [gig.locality, gig.city].filter(Boolean).join(", ");

  return (
    <article onClick={onClick}>
      <div className="thumb" style={{ background: "#dbe7ff" }}>
        {iconFor(category)}
      </div>
      <div className="info">
        <p className="cat">
          {category}
          {gig.distanceKm != null ? " · " + gig.distanceKm + " km" : ""}
        </p>
        <h3>{gig.title}</h3>
        <p className="meta">
          {place}
          {gig.durationText ? " · " + gig.durationText : ""}
        </p>
        <div className="bottom">
          <span className="pay">
            ₹{gig.payAmount} {payLabel}
          </span>
          <span className="spots">{gig.workersNeeded} slots</span>
        </div>
      </div>
    </article>
  );
}

export default GigCard;