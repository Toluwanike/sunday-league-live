import { useQuery } from "@tanstack/react-query";
import { fetchTeams, fetchPlayers } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function TeamsPage() {
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const { data: players } = useQuery({ queryKey: ["players"], queryFn: () => fetchPlayers() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        Teams
      </h1>

      {teams?.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No teams registered yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {teams?.map((team) => {
          const teamPlayers = players?.filter((p: any) => p.team_id === team.id) ?? [];
          return (
            <Card key={team.id} className="p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                {team.name}
              </h3>
              {teamPlayers.length > 0 ? (
                <div className="space-y-1">
                  {teamPlayers.map((p: any) => (
                    <div key={p.id} className="text-sm flex items-center gap-2">
                      <span className="font-mono text-muted-foreground w-5 text-right">{p.shirt_number ?? "-"}</span>
                      <span>{p.name}</span>
                      {p.position && <span className="text-xs text-muted-foreground">({p.position})</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No players registered</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
