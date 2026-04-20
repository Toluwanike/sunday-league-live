// MatchesPage.tsx
// Lists all matches grouped into three sections:
// 1. Live / In Progress — matches happening right now
// 2. League matches — numbered Match 1, 2, 3 etc, grouped by status (upcoming then finished)
// 3. Cup matches — Semi Finals (Leg 1 / Leg 2) and Final shown separately

import { useQuery } from "@tanstack/react-query";
import { fetchMatches } from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Calendar, Trophy, Zap } from "lucide-react";
import { useMemo } from "react";

// Section header component — reused for each group of matches
function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {/* Small badge showing how many matches are in this section */}
      <span className="ml-auto text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5 font-mono">
        {count}
      </span>
    </div>
  );
}

// Label shown above each match card e.g. "Match 3" or "Semi Final 1 — Leg 2"
function MatchLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
      {label}
    </p>
  );
}

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    refetchInterval: 5000, // refresh every 5 seconds to catch live updates
  });

  // ── Separate and organise matches into groups ──────────────────────────────
  const { liveMatches, leagueMatches, semiFinals, finals, playoffs } = useMemo(() => {
    if (!matches) return { liveMatches: [], leagueMatches: [], semiFinals: [], finals: [], playoffs: [] };

    // Live matches — shown at the top regardless of type
    const liveMatches = matches.filter(
      (m) => m.status === "live" || m.status === "paused"
    );

    // League matches — sorted by date so numbering is chronological
    const leagueMatches = matches
      .filter((m) => m.match_type === "league" || !m.match_type)
      .filter((m) => m.status !== "live" && m.status !== "paused")
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

    // Cup semi finals — sorted by leg number
    const semiFinals = matches
      .filter((m) => m.match_type === "cup" && m.round === "semi_final")
      .filter((m) => m.status !== "live" && m.status !== "paused")
      .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1));

    // Cup final
   const finals = matches
  .filter((m) => m.match_type === "cup" && m.round === "final")
  .filter((m) => m.status !== "live" && m.status !== "paused");

// Playoff — single match to decide 4th cup spot when teams are level on points
const playoffs = matches
  .filter((m) => m.match_type === "cup" && m.round === "playoff")
  .filter((m) => m.status !== "live" && m.status !== "paused");

return { liveMatches, leagueMatches, semiFinals, finals, playoffs };
}, [matches]);

  // ── Build semi final label e.g. "Semi Final 1 — Leg 2" ────────────────────
  // We need to figure out which semi final pair each match belongs to
  // Pair 1 = first two teams, Pair 2 = second two teams
  // We group by the combination of home/away team IDs
  const getSemiFinalLabel = (match: any, allSemiFinals: any[]) => {
    // Get all unique semi final pairings (leg 1 matches define the pairs)
    const leg1Matches = allSemiFinals.filter((m) => (m.leg ?? 1) === 1);

    // Find which pair this match belongs to
    const pairIndex = leg1Matches.findIndex(
      (l1) =>
        (l1.home_team_id === match.home_team_id && l1.away_team_id === match.away_team_id) ||
        (l1.home_team_id === match.away_team_id && l1.away_team_id === match.home_team_id)
    );

    const pairNumber = pairIndex + 1;
    const leg = match.leg ?? 1;
    return `Semi Final ${pairNumber} — Leg ${leg}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalMatches = matches?.length ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6 text-primary" />
        All Matches
        <span className="text-sm font-normal text-muted-foreground ml-1">
          ({totalMatches} total)
        </span>
      </h1>

      {/* ── Live matches section ─────────────────────────────────────────────
          Always shown at the top when any match is live or paused
          so viewers can instantly see what's happening right now        */}
      {liveMatches.length > 0 && (
        <section>
          <SectionHeader
            icon={<Zap className="h-4 w-4 text-live" />}
            title="Live Now"
            count={liveMatches.length}
          />
          <div className="grid gap-3">
            {liveMatches.map((m) => (
              <div key={m.id}>
                <MatchLabel
                  label={
                    m.match_type === "cup" && m.round === "final"
                      ? "Cup Final"
                      : m.match_type === "cup"
                      ? getSemiFinalLabel(m, matches?.filter((x) => x.round === "semi_final") ?? [])
                      : `League Match`
                  }
                />
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── League matches section ───────────────────────────────────────────
          Numbered chronologically as Match 1, Match 2 etc
          Upcoming matches shown first then finished ones below            */}
      {leagueMatches.length > 0 && (
        <section>
          <SectionHeader
            icon={<Calendar className="h-4 w-4 text-primary" />}
            title="League Matches"
            count={leagueMatches.length}
          />

          {/* Upcoming league matches */}
          {leagueMatches.filter((m) => m.status === "not_started").length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 px-1">Upcoming</p>
              <div className="grid gap-3">
                {leagueMatches
                  .filter((m) => m.status === "not_started")
                  .map((m, i) => {
                    // Match number counts ALL league matches not just upcoming ones
                    // so the number is consistent regardless of section
                    const matchNumber = leagueMatches.indexOf(m) + 1;
                    return (
                      <div key={m.id}>
                        <MatchLabel label={`Match ${matchNumber}`} />
                        <MatchCard match={m} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Finished league matches */}
          {leagueMatches.filter((m) => m.status === "finished").length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 px-1">Results</p>
              <div className="grid gap-3">
                {leagueMatches
                  .filter((m) => m.status === "finished")
                  .map((m) => {
                    const matchNumber = leagueMatches.indexOf(m) + 1;
                    return (
                      <div key={m.id}>
                        <MatchLabel label={`Match ${matchNumber}`} />
                        <MatchCard match={m} />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Cup matches section ──────────────────────────────────────────────
          Split into Semi Finals and Final subsections
          Each semi final shows its pair number and leg number clearly     */}
      {(semiFinals.length > 0 || finals.length > 0) && (
        <section>
          <SectionHeader
            icon={<Trophy className="h-4 w-4 text-primary" />}
            title="Cup"
            count={semiFinals.length + finals.length + playoffs.length}
          />

          {/* Qualification playoff */}
              {(() => {
                const playoffs = matches?.filter(
                  (m) => m.match_type === "cup" && m.round === "playoff"
                ).filter(
                  (m) => m.status !== "live" && m.status !== "paused"
                ) ?? [];

                if (playoffs.length === 0) return null;

                return (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2 px-1">
                      Qualification Playoff
                    </p>
                    <div className="grid gap-3">
                      {playoffs.map((m) => (
                        <div key={m.id}>
                          <MatchLabel label="4th Place Playoff" />
                          <MatchCard match={m} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

          {/* Semi finals */}
          {semiFinals.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 px-1">Semi Finals</p>
              <div className="grid gap-3">
                {semiFinals.map((m) => (
                  <div key={m.id}>
                    <MatchLabel label={getSemiFinalLabel(m, semiFinals)} />
                    <MatchCard match={m} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final */}
          {finals.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 px-1">Final</p>
              <div className="grid gap-3">
                {finals.map((m) => (
                  <div key={m.id}>
                    {/* Trophy icon label for the final to make it stand out */}
                    <MatchLabel label="🏆 Cup Final" />
                    <MatchCard match={m} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────
          Only shown when there are genuinely no matches at all            */}
      {totalMatches === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No matches scheduled yet.
        </p>
      )}
    </div>
  );
}
