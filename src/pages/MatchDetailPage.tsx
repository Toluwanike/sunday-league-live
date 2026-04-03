import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMatch, fetchMatchEvents, fetchMatchLineups } from "@/lib/supabase-helpers";
import MatchStatusBadge from "@/components/MatchStatusBadge";
import { format } from "date-fns";
import { CircleDot, Square, ArrowRightLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { EventType } from "@/lib/supabase-helpers";

function EventIcon({ type }: { type: EventType }) {
  switch (type) {
    case "goal":
      return <CircleDot className="h-4 w-4 text-primary" />;
    case "yellow_card":
      return <Square className="h-3 w-3 fill-warning text-warning" />;
    case "red_card":
      return <Square className="h-3 w-3 fill-live text-live" />;
    case "substitution":
      return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => fetchMatch(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: events } = useQuery({
    queryKey: ["match-events", id],
    queryFn: () => fetchMatchEvents(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: lineups } = useQuery({
    queryKey: ["match-lineups", id],
    queryFn: () => fetchMatchLineups(id!),
    enabled: !!id,
  });

  if (isLoading || !match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isLive = match.status === "live" || match.status === "halftime";
  const homeLineup = lineups?.filter((l: any) => l.team_id === match.home_team_id) ?? [];
  const awayLineup = lineups?.filter((l: any) => l.team_id === match.away_team_id) ?? [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Scoreboard */}
      <Card className={`p-6 text-center ${isLive ? "border-live/30 shadow-lg shadow-live/5" : ""}`}>
        <div className="mb-2">
          <MatchStatusBadge status={match.status} />
        </div>
        <p className="text-xs text-muted-foreground font-mono mb-4">
          {format(new Date(match.match_date), "EEEE, dd MMMM yyyy • HH:mm")}
        </p>

        <div className="flex items-center justify-center gap-6">
          <div className="flex-1 text-right">
            <p className="text-lg font-bold">{match.home_team.name}</p>
          </div>
          <div className="font-mono text-4xl font-bold flex items-center gap-3 min-w-[100px] justify-center">
            <span>{match.status === "not_started" ? "-" : match.home_score}</span>
            <span className="text-muted-foreground text-2xl">:</span>
            <span>{match.status === "not_started" ? "-" : match.away_score}</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-lg font-bold">{match.away_team.name}</p>
          </div>
        </div>
      </Card>

      {/* Events Timeline */}
      {events && events.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Match Events</h3>
          <div className="space-y-3">
            {events.map((event: any) => (
              <div key={event.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-muted-foreground w-8 text-right">{event.minute}'</span>
                <EventIcon type={event.event_type} />
                <span className="font-medium">{event.player.name}</span>
                {event.assist_player && (
                  <span className="text-muted-foreground text-xs">(assist: {event.assist_player.name})</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lineups */}
      {(homeLineup.length > 0 || awayLineup.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {match.home_team.name}
            </h3>
            <div className="space-y-1.5">
              {homeLineup.map((l: any) => (
                <div key={l.id} className="text-sm flex items-center gap-2">
                  <span className="font-mono text-muted-foreground text-xs w-5">{l.player.shirt_number}</span>
                  <span>{l.player.name}</span>
                  {!l.is_starter && <span className="text-xs text-muted-foreground">(sub)</span>}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {match.away_team.name}
            </h3>
            <div className="space-y-1.5">
              {awayLineup.map((l: any) => (
                <div key={l.id} className="text-sm flex items-center gap-2">
                  <span className="font-mono text-muted-foreground text-xs w-5">{l.player.shirt_number}</span>
                  <span>{l.player.name}</span>
                  {!l.is_starter && <span className="text-xs text-muted-foreground">(sub)</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
