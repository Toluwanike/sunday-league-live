// StandingsPage.tsx
// Shows the league phase standings table
// Only counts finished LEAGUE matches — cup matches are excluded
// Sorted by: Points → Goal Difference → Goals For (same as UCL group stage tiebreakers)

import { useQuery } from "@tanstack/react-query";
import { fetchMatches, fetchTeams } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useMemo } from "react";

// Shape of each row in the standings table
type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goals for
  ga: number; // goals against
  gd: number; // goal difference
  points: number;
};

export default function StandingsPage() {
  // Fetch all matches and all teams from Supabase
  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    refetchInterval: 10000, // refresh every 10 seconds to catch new results
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  // useMemo recalculates standings only when matches or teams data changes
  // This avoids recalculating on every render which would be wasteful
  const standings = useMemo(() => {
    if (!teams || !matches) return [];

    // Build a map of teamId → standing row
    // Start every team at zero for all stats
    const map = new Map<string, StandingRow>();
    teams.forEach((t) =>
      map.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
      })
    );

    matches
      // Only count finished matches — ignore live, paused, upcoming
      .filter((m) => m.status === "finished")
      // Only count league matches — this is the key fix that excludes cup matches
      // Without this filter, semi finals and finals would skew the league table
      .filter((m) => m.match_type === "league" || !m.match_type)
      .forEach((m) => {
        const home = map.get(m.home_team_id);
        const away = map.get(m.away_team_id);
        if (!home || !away) return; // skip if team not found (data integrity guard)

        // Increment games played for both teams
        home.played++;
        away.played++;

        // Add goals scored and conceded
        home.gf += m.home_score;
        home.ga += m.away_score;
        away.gf += m.away_score;
        away.ga += m.home_score;

        // Determine result and assign points
        if (m.home_score > m.away_score) {
          // Home win — 3 points to home, 0 to away
          home.won++; home.points += 3;
          away.lost++;
        } else if (m.home_score < m.away_score) {
          // Away win — 3 points to away, 0 to home
          away.won++; away.points += 3;
          home.lost++;
        } else {
          // Draw — 1 point each
          home.drawn++; away.drawn++;
          home.points += 1; away.points += 1;
        }

        // Recalculate goal difference after each match
        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
      });

    // Sort by points first, then goal difference, then goals scored
    // This matches the UCL group stage tiebreaker order
    return Array.from(map.values()).sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf
    );
  }, [matches, teams]);

  // Top 4 teams qualify for the cup knockout stage
  const top4Ids = standings.slice(0, 4).map((r) => r.teamId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        League Standings
      </h1>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">League Phase</h2>
          <span className="text-xs text-muted-foreground">Top 4 qualify for the cup</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Team</th>
                <th className="text-center p-3 font-medium text-muted-foreground">P</th>
                <th className="text-center p-3 font-medium text-muted-foreground">W</th>
                <th className="text-center p-3 font-medium text-muted-foreground">D</th>
                <th className="text-center p-3 font-medium text-muted-foreground">L</th>
                <th className="text-center p-3 font-medium text-muted-foreground">GF</th>
                <th className="text-center p-3 font-medium text-muted-foreground">GA</th>
                <th className="text-center p-3 font-medium text-muted-foreground">GD</th>
                <th className="text-center p-3 font-semibold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => {
                // Check if this team is in the top 4 (cup qualified)
                const isTop4 = top4Ids.includes(row.teamId);
                return (
                  <tr
                    key={row.teamId}
                    className={`border-b border-border/50 transition-colors ${
                      isTop4
                        ? "bg-primary/5 hover:bg-primary/10" // highlight top 4 rows
                        : "hover:bg-secondary/30"
                    }`}
                  >
                    <td className="p-3 font-mono text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        {i + 1}
                        {/* Green dot next to top 4 teams to indicate cup qualification */}
                        {isTop4 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" title="Cup qualified" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{row.teamName}</td>
                    <td className="text-center p-3 font-mono">{row.played}</td>
                    <td className="text-center p-3 font-mono">{row.won}</td>
                    <td className="text-center p-3 font-mono">{row.drawn}</td>
                    <td className="text-center p-3 font-mono">{row.lost}</td>
                    <td className="text-center p-3 font-mono">{row.gf}</td>
                    <td className="text-center p-3 font-mono">{row.ga}</td>
                    <td className="text-center p-3 font-mono">
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </td>
                    <td className="text-center p-3 font-mono font-bold text-primary">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {standings.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No completed matches yet.
          </p>
        )}

        {/* Legend explaining what the green dot means */}
        <div className="p-3 border-t border-border flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Qualifies for cup</span>
        </div>
      </Card>
    </div>
  );
}