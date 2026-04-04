// Dashboard.tsx
// The main homepage viewers land on
// Shows: live match (if any), upcoming fixtures, recent results
// Refreshes every 5 seconds automatically to catch live score updates

import { useQuery } from "@tanstack/react-query";
import { fetchMatches } from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Trophy, Zap, Calendar, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    // Poll every 5 seconds — this is how viewers see score updates
    // without needing to refresh the page manually
    refetchInterval: 5000,
  });

  // Split matches into three buckets based on their status
  const liveMatches = matches?.filter(
    (m) => m.status === "live" || m.status === "halftime"
  ) ?? [];

  const upcoming = matches?.filter(
    (m) => m.status === "not_started"
  ) ?? [];

  // Only show the 5 most recent finished matches
  const recentResults = matches?.filter(
    (m) => m.status === "finished"
  ).slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-pitch flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Sunday League
        </h1>
        <p className="text-muted-foreground mt-1">Live scores, results & stats</p>
      </div>

      {/* ── Live Matches ──────────────────────────────────────────────────── */}
      {/* Only shown when there is at least one live or halftime match */}
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-live animate-pulse" />
            Live Now
          </h2>
          <div className="grid gap-3">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming Fixtures ─────────────────────────────────────────────── */}
      {/* Shows matches that haven't started yet, sorted by date (earliest first) */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Upcoming Fixtures
          </h2>
          <div className="grid gap-3">
            {/* Sort upcoming by match date so the next match shows first */}
            {[...upcoming]
              .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
              .map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
          </div>
        </section>
      )}

      {/* ── Recent Results ────────────────────────────────────────────────── */}
      {/* Shows the last 5 finished matches */}
      {recentResults.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Recent Results
          </h2>
          <div className="grid gap-3">
            {recentResults.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {/* Only shown when there are absolutely no matches at all */}
      {!matches?.length && (
        <div className="text-center py-16">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            No matches yet
          </h2>
          <p className="text-muted-foreground/60 mt-1">
            Check back on match day!
          </p>
        </div>
      )}
    </div>
  );
}