function JobCard({ job, onClick }) {
  return (
    <article onClick={onClick}>
      <div className="thumb" style={{ background: job.color }}>
        {job.icon}
      </div>
      <div className="info">
        <p className="cat">
          {job.category} · {job.km} km
        </p>
        <h3>{job.title}</h3>
        <p className="meta">
          {job.place} · {job.when}
        </p>
        <div className="bottom">
          <span className="pay">
            ₹{job.pay} {job.payType}
          </span>
          <span className="spots">{job.spots} spots left</span>
        </div>
      </div>
    </article>
  );
}

export default JobCard;