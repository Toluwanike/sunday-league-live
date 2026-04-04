import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, CircleDot, Square } from "lucide-react";

type PlayerStat = {
  id: string;
  name: string;
  team_name: string;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

async function fetchPlayerStats(): Promise<PlayerStat[]> {
  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("id, name, team:teams(name)");
  if (pErr) throw pErr;

  const { data: events, error: eErr } = await supabase
    .from("match_events")
    .select("player_id, assist_player_id, event_type");
  if (eErr) throw eErr;

  const stats = new Map<string, PlayerStat>();
  players?.forEach((p: any) => {
    stats.set(p.id, {
      id: p.id,
      name: p.name,
      team_name: p.team?.name ?? "",
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
    });
  });

  events?.forEach((e: any) => {
    const player = stats.get(e.player_id);
    if (player) {
      if (e.event_type === "goal") player.goals++;
      if (e.event_type === "yellow_card") player.yellow_cards++;
      if (e.event_type === "red_card") player.red_cards++;
    }
    if (e.event_type === "goal" && e.assist_player_id) {
      const assister = stats.get(e.assist_player_id);
      if (assister) assister.assists++;
    }
  });

  return Array.from(stats.values()).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["player-stats"],
    queryFn: fetchPlayerStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const topScorers = stats?.filter((s) => s.goals > 0).slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Player Statistics
      </h1>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" /> Top Scorers
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Player</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Team</th>
                <th className="text-center p-3 font-medium text-muted-foreground">
                  <CircleDot className="h-3 w-3 inline" />
                </th>
                <th className="text-center p-3 font-medium text-muted-foreground">A</th>
                <th className="text-center p-3 font-medium text-muted-foreground">
                  <Square className="h-3 w-3 inline fill-warning text-warning" />
                </th>
                <th className="text-center p-3 font-medium text-muted-foreground">
                  <Square className="h-3 w-3 inline fill-live text-live" />
                </th>
              </tr>
            </thead>
            <tbody>
              {topScorers.map((p, i) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.team_name}</td>
                  <td className="text-center p-3 font-mono font-bold text-primary">{p.goals}</td>
                  <td className="text-center p-3 font-mono">{p.assists}</td>
                  <td className="text-center p-3 font-mono">{p.yellow_cards}</td>
                  <td className="text-center p-3 font-mono">{p.red_cards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topScorers.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No goals scored yet.</p>
        )}
      </Card>
    </div>
  );
}
