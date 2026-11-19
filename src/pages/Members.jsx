import { useMemo, useState } from "react";
import { ErrorState, LoadingState, PageIntro } from "../App.jsx";
import MemberCard from "../components/MemberCard.jsx";
import CommunityMembers from "../components/CommunityMembers.jsx";

export default function Members({ members, loading, error }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return members.filter((member) => `${member.name} ${member.sport}`.toLowerCase().includes(term));
  }, [members, query]);
  return (
    <main>
      <PageIntro eyebrow="THE NNB COMMUNITY" title="Meet our members" description="Meet the young athletes who show up, put in the work and make this community special." />
      <section className="members-section members-page">
        <div className="container">
          <label className="member-search">Find an athlete<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or sport…" /></label>
          {loading && <LoadingState label="Loading our athletes…" />}
          {error && <ErrorState message={error} />}
          {!loading && !error && filtered.length > 0 && <div className="member-grid">{filtered.map((member) => <MemberCard key={member.id} member={member} />)}</div>}
          {!loading && !error && filtered.length === 0 && <p className="empty-search">No athletes match that search. Try another name or sport.</p>}
        </div>
      </section>
      <CommunityMembers filter={query} />
    </main>
  );
}
