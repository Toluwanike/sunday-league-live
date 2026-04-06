// MatchCard.tsx
// Displays a single match as a clickable card
// Shows date, teams, score, live timer and status badge

import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import MatchStatusBadge from "./MatchStatusBadge";
import MatchTimer from "./MatchTimer";
import type { MatchWithTeams } from "@/lib/supabase-helpers";
import { format } from "date-fns";

export default function MatchCard({ match }: { match: MatchWithTeams }) {
  const isLive = match.status === "live" || match.status === "halftime";

  return (
    <Link to={`/match/${match.id}`}>
      <Card className={`p-4 transition-all hover:border-primary/30 ${isLive ? "border-live/30 shadow-lg shadow-live/5" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-mono">
            {format(new Date(match.match_date), "dd MMM yyyy • HH:mm")}
          </span>
          <div className="flex items-center gap-2">
            {isLive && <MatchTimer match={match} />}
            <MatchStatusBadge status={match.status} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right">
            <p className="font-semibold text-sm truncate">{match.home_team.name}</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-2xl font-bold min-w-[80px] justify-center">
            <span className={isLive ? "text-foreground" : "text-muted-foreground"}>
              {match.status === "not_started" ? "-" : match.home_score}
            </span>
            <span className="text-muted-foreground text-lg">:</span>
            <span className={isLive ? "text-foreground" : "text-muted-foreground"}>
              {match.status === "not_started" ? "-" : match.away_score}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm truncate">{match.away_team.name}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}