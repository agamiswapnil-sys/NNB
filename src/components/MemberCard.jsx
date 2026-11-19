import { Link } from "react-router-dom";

export default function MemberCard({ member }) {
  return (
    <Link className="member-card" to={`/members/${member.id}`}>
      <div className="member-photo-wrap">
        <img src={member.photo} alt={`${member.name}, ${member.sport} athlete`} loading="lazy" />
        <span className="member-arrow" aria-hidden="true">↗</span>
      </div>
      <div className="member-card-copy">
        <h3>{member.name}</h3>
        <span>{member.sport}</span>
      </div>
    </Link>
  );
}
