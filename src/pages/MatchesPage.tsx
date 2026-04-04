// MatchesPage.tsx
// Shows ALL matches grouped into three sections:
// 1. Live (currently being played)
// 2. Upcoming (not started yet)
// 3. Results (finished matches)

import { useQuery } from "@tanstack/react-query";
import { fetchMatches } from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Calendar, Zap, CheckCircle } from "lucide-react";

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    // Refresh every 5 seconds to keep scores up to date
    refetchInterval: 5000,
  });

  // Group matches by their current status
  const liveMatches = matches?.filter(
    (m) => m.status === "live" || m.status === "halftime"
  ) ?? [];

  const upcoming = matches?.filter(
    (m) => m.status === "not_started"
  ) ?? [];

  const results = matches?.filter(
    (m) => m.status === "finished"
  ) ?? [];

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
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6 text-primary" />
        Matches
      </h1>

      {/* ── Live ─────────────────────────────────────────────────────────── */}
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-live animate-pulse" />
            Live
          </h2>
          <div className="grid gap-3">
            {liveMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* ── Upcoming ──────────────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Upcoming
          </h2>
          <div className="grid gap-3">
            {/* Sort by date — nearest match first */}
            {[...upcoming]
              .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
              .map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <section>
          <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            Results
          </h2>
          <div className="grid gap-3">
            {/* Most recent result first */}
            {[...results]
              .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
              .map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {!matches?.length && (
        <p className="text-center text-muted-foreground py-12">
          No matches scheduled yet.
        </p>
      )}
    </div>
  );
}