// StatsPage.tsx
// Shows a table of every player's goals, assists, and combined G/A
// Sorted by most goals first, then assists as a tiebreaker

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

// Shape of each player's stats row
type PlayerStat = {
  id: string;
  name: string;
  team_name: string;
  goals: number;
  assists: number;
};

// Fetches all players and all match events, then calculates stats locally
async function fetchPlayerStats(): Promise<PlayerStat[]> {
  // Get every player with their team name
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name, team:teams(name)");
  if (pErr) throw pErr;

  // Get every goal event so we can count goals and assists
  const { data: events, error: eErr } = await supabase
    .from("match_events")
    .select("player_id, assist_player_id, event_type");
  if (eErr) throw eErr;

  // Build a map of player id → stats object
  // We start everyone at 0 goals and 0 assists
  const stats = new Map<string, PlayerStat>();
  players?.forEach((p: any) => {
    stats.set(p.id, {
      id: p.id,
      name: p.name,
      team_name: p.team?.name ?? "Unknown",
      goals: 0,
      assists: 0,
    });
  });

  // Loop through every event and increment the right player's stats
  events?.forEach((e: any) => {
    if (e.event_type === "goal") {
      // Increment goal scorer
      const scorer = stats.get(e.player_id);
      if (scorer) scorer.goals++;

      // Increment assist provider if there was one
      if (e.assist_player_id) {
        const assister = stats.get(e.assist_player_id);
        if (assister) assister.assists++;
      }
    }
  });

  // Convert map to array and sort:
  // 1st priority: most goals
  // 2nd priority: most assists (tiebreaker)
  return Array.from(stats.values()).sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists
  );
}

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["player-stats"],
    queryFn: fetchPlayerStats,
    // Refresh every 10 seconds so stats stay up to date during a live match
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Player Statistics
      </h1>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Goals & Assists</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            G = Goals · A = Assists · G/A = Combined
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {/* Rank column */}
                <th className="text-left p-3 font-medium text-muted-foreground w-10">#</th>
                {/* Player name */}
                <th className="text-left p-3 font-medium text-muted-foreground">Player</th>
                {/* Team name */}
                <th className="text-left p-3 font-medium text-muted-foreground">Team</th>
                {/* Goals */}
                <th className="text-center p-3 font-medium text-muted-foreground w-14">G</th>
                {/* Assists */}
                <th className="text-center p-3 font-medium text-muted-foreground w-14">A</th>
                {/* Goals + Assists combined */}
                <th className="text-center p-3 font-medium text-muted-foreground w-14">G/A</th>
              </tr>
            </thead>
            <tbody>
              {stats?.map((p, i) => {
                const ga = p.goals + p.assists;
                const isTopScorer = i === 0 && p.goals > 0;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border/50 transition-colors ${
                      isTopScorer
                        ? "bg-primary/5" // highlight the top scorer row
                        : "hover:bg-secondary/30"
                    }`}
                  >
                    {/* Rank number */}
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {i + 1}
                    </td>

                    {/* Player name — bold if they have goals or assists */}
                    <td className={`p-3 ${ga > 0 ? "font-semibold" : "text-muted-foreground"}`}>
                      {p.name}
                      {/* Crown emoji next to the top scorer */}
                      {isTopScorer && (
                        <span className="ml-1 text-xs text-yellow-500">★</span>
                      )}
                    </td>

                    {/* Team name */}
                    <td className="p-3 text-muted-foreground text-xs">{p.team_name}</td>

                    {/* Goals — highlighted in primary color if they have any */}
                    <td className={`text-center p-3 font-mono font-bold ${
                      p.goals > 0 ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {p.goals}
                    </td>

                    {/* Assists */}
                    <td className={`text-center p-3 font-mono ${
                      p.assists > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}>
                      {p.assists}
                    </td>

                    {/* G/A combined — only bold if they have contributions */}
                    <td className={`text-center p-3 font-mono ${
                      ga > 0 ? "font-bold text-foreground" : "text-muted-foreground"
                    }`}>
                      {ga}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state — shown when no players exist yet */}
        {!stats?.length && (
          <p className="text-center text-muted-foreground py-12">
            No players registered yet.
          </p>
        )}
      </Card>
    </div>
  );
}