import { useQuery } from "@tanstack/react-query";
import { fetchMatches, fetchTeams } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useMemo } from "react";

type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export default function StandingsPage() {
  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  const standings = useMemo(() => {
    if (!teams || !matches) return [];
    const map = new Map<string, StandingRow>();
    teams.forEach((t) =>
      map.set(t.id, { teamId: t.id, teamName: t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 })
    );

    matches
      .filter((m) => m.status === "finished")
      .forEach((m) => {
        const home = map.get(m.home_team_id);
        const away = map.get(m.away_team_id);
        if (!home || !away) return;

        home.played++;
        away.played++;
        home.gf += m.home_score;
        home.ga += m.away_score;
        away.gf += m.away_score;
        away.ga += m.home_score;

        if (m.home_score > m.away_score) {
          home.won++;
          home.points += 3;
          away.lost++;
        } else if (m.home_score < m.away_score) {
          away.won++;
          away.points += 3;
          home.lost++;
        } else {
          home.drawn++;
          away.drawn++;
          home.points += 1;
          away.points += 1;
        }

        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
      });

    return Array.from(map.values()).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }, [matches, teams]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        League Standings
      </h1>

      <Card className="overflow-hidden">
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
              {standings.map((row, i) => (
                <tr key={row.teamId} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-semibold">{row.teamName}</td>
                  <td className="text-center p-3 font-mono">{row.played}</td>
                  <td className="text-center p-3 font-mono">{row.won}</td>
                  <td className="text-center p-3 font-mono">{row.drawn}</td>
                  <td className="text-center p-3 font-mono">{row.lost}</td>
                  <td className="text-center p-3 font-mono">{row.gf}</td>
                  <td className="text-center p-3 font-mono">{row.ga}</td>
                  <td className="text-center p-3 font-mono">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="text-center p-3 font-mono font-bold text-primary">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {standings.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No completed matches yet.</p>
        )}
      </Card>
    </div>
  );
}
