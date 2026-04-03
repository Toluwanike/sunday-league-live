import { useQuery } from "@tanstack/react-query";
import { fetchMatches } from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Trophy, Zap } from "lucide-react";

export default function Dashboard() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    refetchInterval: 5000,
  });

  const liveMatches = matches?.filter((m) => m.status === "live" || m.status === "halftime") ?? [];
  const recentMatches = matches?.filter((m) => m.status === "finished").slice(0, 5) ?? [];
  const upcoming = matches?.filter((m) => m.status === "not_started").slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gradient-pitch flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Sunday League
        </h1>
        <p className="text-muted-foreground mt-1">Live scores, standings & stats</p>
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-live" />
            Live Now
          </h2>
          <div className="grid gap-3">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
          <div className="grid gap-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {recentMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Results</h2>
          <div className="grid gap-3">
            {recentMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {!matches?.length && (
        <div className="text-center py-16">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No matches yet</h2>
          <p className="text-muted-foreground/60 mt-1">Log in as admin to create your first match</p>
        </div>
      )}
    </div>
  );
}
