// StatsPage.tsx
// Shows player statistics for the active competition only
// Sorted by goals then assists — shows all players not just top scorers

import { useQuery } from "@tanstack/react-query";
import { fetchActiveCompetition, fetchAllEvents, fetchPlayers } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Users, CircleDot, Square } from "lucide-react";
import { useMemo } from "react";

type PlayerStat = {
  id: string;
  name: string;
  team_name: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

export default function StatsPage() {
  // Scope everything to the active competition
  const { data: competition } = useQuery({
    queryKey: ["active-competition"],
    queryFn: fetchActiveCompetition,
  });

  const competitionId = competition?.id;

  // Fetch all players in this competition with their team joined
  const { data: players } = useQuery({
    queryKey: ["players", competitionId],
    queryFn: () => fetchPlayers(undefined, competitionId),
    enabled: !!competitionId,
  });

  // Fetch all match events for this competition
  // This includes goals, cards and substitutions
  const { data: events, isLoading } = useQuery({
    queryKey: ["all-events", competitionId],
    queryFn: () => fetchAllEvents(competitionId),
    enabled: !!competitionId,
    refetchInterval: 10000,
  });

  // Build player stats map from events
  // Start every player at zero then increment as we process events
  const stats = useMemo(() => {
    if (!players || !events) return [];

    const map = new Map<string, PlayerStat>();

    // Initialise every player with zero stats
    players.forEach((p: any) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        team_name: p.team?.name ?? "",
        goals: 0,
        assists: 0,
        yellow_cards: 0,
        red_cards: 0,
      });
    });

    // Process each event and increment the relevant counter
    events.forEach((e: any) => {
      const player = map.get(e.player_id);
      if (player) {
        if (e.event_type === "goal") player.goals++;
        if (e.event_type === "yellow_card") player.yellow_cards++;
        if (e.event_type === "red_card") player.red_cards++;
      }
      // Increment assist for the assist player on goal events
      if (e.event_type === "goal" && e.assist_player_id) {
        const assister = map.get(e.assist_player_id);
        if (assister) assister.assists++;
      }
    });

    // Sort by goals first then assists — players with no stats shown last
    return Array.from(map.values()).sort(
      (a, b) => b.goals - a.goals || b.assists - a.assists
    );
  }, [players, events]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Player Statistics
        </h1>
        {competition && (
          <p className="text-sm text-muted-foreground mt-1">
            {competition.name} · {competition.format}
          </p>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            Player Stats
          </h3>
          <span className="text-xs text-muted-foreground">
            {stats.length} players
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Player</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Team</th>
                {/* Goal icon header */}
                <th className="text-center p-3 font-medium text-muted-foreground">
                  <CircleDot className="h-3 w-3 inline" title="Goals" />
                </th>
                <th className="text-center p-3 font-medium text-muted-foreground">A</th>
                {/* Yellow card icon header */}
                <th className="text-center p-3 font-medium text-muted-foreground">
                  <Square className="h-3 w-3 inline fill-warning text-warning" title="Yellow cards" />
                </th>
                {/* Red card icon header */}
                <th className="text-center p-3 font-medium text-muted-foreground">
                  <Square className="h-3 w-3 inline fill-live text-live" title="Red cards" />
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">
                    {p.team_name}
                  </td>
                  <td className="text-center p-3 font-mono font-bold text-primary">
                    {p.goals}
                  </td>
                  <td className="text-center p-3 font-mono">{p.assists}</td>
                  <td className="text-center p-3 font-mono">{p.yellow_cards}</td>
                  <td className="text-center p-3 font-mono">{p.red_cards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stats.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No player stats yet.
          </p>
        )}
      </Card>
    </div>
  );
}