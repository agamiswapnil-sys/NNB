import { useEffect, useMemo, useState } from "react";
import { getCommunityMembers } from "../api.js";

export default function CommunityMembers({ filter = "" }) {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCommunityMembers()
      .then((records) => { if (active) setMembers(records); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  const filteredMembers = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return members.filter((member) => member.name.toLowerCase().includes(query));
  }, [filter, members]);

  if (error) {
    return <p className="community-members-error" role="alert">The community members list is temporarily unavailable.</p>;
  }
  if (filteredMembers.length === 0) return null;

  return (
    <section className="community-members-section">
      <div className="container">
        <div className="community-members-heading">
          <span className="eyebrow">OPTED-IN COMMUNITY</span>
          <h2>Our community members</h2>
          <p>These visitors chose to have their names shown. Contact details remain private.</p>
        </div>
        <div className="community-member-list">
          {filteredMembers.map((member) => (
            <article className="community-member-card" key={member.id}>
              <span className="community-member-initial" aria-hidden="true">{member.name.trim().charAt(0).toUpperCase()}</span>
              <span>{member.name}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
