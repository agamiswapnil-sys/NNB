import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../App.jsx";
import { getPlayer } from "../api.js";
import PlayerBio from "../components/PlayerBio.jsx";
import KeyHighlights from "../components/KeyHighlights.jsx";
import SportsEvents from "../components/SportsEvents.jsx";

export default function PlayerProfile() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    let mounted = true;
    setPlayer(null);
    setState({ loading: true, error: "" });
    getPlayer(playerId)
      .then((data) => { if (mounted) { setPlayer(data); setState({ loading: false, error: "" }); } })
      .catch((error) => { if (mounted) setState({ loading: false, error: error.message }); });
    return () => { mounted = false; };
  }, [playerId]);

  if (state.loading) return <main className="profile-loading"><LoadingState label="Loading player profile…" /></main>;
  if (state.error) return <main className="profile-loading"><ErrorState message={state.error} /></main>;
  return (
    <main>
      <PlayerBio player={player} />
      <KeyHighlights highlights={player.highlights} />
      <SportsEvents playerId={player.id} events={player.events} />
    </main>
  );
}
