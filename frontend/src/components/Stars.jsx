function Stars({ value }) {
  const filled = Math.max(0, Math.min(5, Math.round(value || 0)));
  return (
    <span className="stars">
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}

export default Stars;