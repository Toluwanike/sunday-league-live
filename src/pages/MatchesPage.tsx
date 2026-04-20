// MatchesPage.tsx
// Lists all matches for the active competition grouped into sections:
// 1. Live / In Progress — matches happening right now
// 2. League matches — numbered Match 1, 2, 3 etc, grouped by status
// 3. Cup matches — Playoff, Semi Finals and Final shown separately
// All data is scoped to the active competition only

import { useQuery } from "@tanstack/react-query";
import { fetchMatches, fetchActiveCompetition } from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Calendar, Trophy, Zap } from "lucide-react";
import { useMemo } from "react";

// Section header — reused for each group of matches
// Shows the section title, icon and a count badge
function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {/* Badge showing how many matches are in this section */}
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
  // ── Step 1: fetch active competition ──────────────────────────────────
  // All matches must be scoped to the active competition
  // Without this, matches from ALL editions would show mixed together
  const { data: competition } = useQuery({
    queryKey: ["active-competition"],
    queryFn: fetchActiveCompetition,
  });

  const competitionId = competition?.id;

  // ── Step 2: fetch matches scoped to this competition ──────────────────
  // enabled: !!competitionId prevents the query running before we have an ID
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches", competitionId],
    queryFn: () => fetchMatches(competitionId),
    enabled: !!competitionId,
    refetchInterval: 5000, // refresh every 5 seconds to catch live updates
  });

  // ── Separate and organise matches into groups ──────────────────────────
  const { liveMatches, leagueMatches, semiFinals, finals, playoffs } =
    useMemo(() => {
      if (!matches)
        return {
          liveMatches: [],
          leagueMatches: [],
          semiFinals: [],
          finals: [],
          playoffs: [],
        };

      // Live / paused matches — shown at the top regardless of match type
      const liveMatches = matches.filter(
        (m) => m.status === "live" || m.status === "paused"
      );

      // League matches sorted chronologically so Match 1 is always the first played
      const leagueMatches = matches
        .filter((m) => m.match_type === "league" || !m.match_type)
        .filter((m) => m.status !== "live" && m.status !== "paused")
        .sort(
          (a, b) =>
            new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );

      // Cup semi finals sorted by leg so Leg 1 always appears before Leg 2
      const semiFinals = matches
        .filter((m) => m.match_type === "cup" && m.round === "semi_final")
        .filter((m) => m.status !== "live" && m.status !== "paused")
        .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1));

      // Cup final — single match
      const finals = matches
        .filter((m) => m.match_type === "cup" && m.round === "final")
        .filter((m) => m.status !== "live" && m.status !== "paused");

      // Qualification playoff — single match to decide 4th cup spot
      const playoffs = matches
        .filter((m) => m.match_type === "cup" && m.round === "playoff")
        .filter((m) => m.status !== "live" && m.status !== "paused");

      return { liveMatches, leagueMatches, semiFinals, finals, playoffs };
    }, [matches]);

  // ── Build semi final label e.g. "Semi Final 1 — Leg 2" ────────────────
  // Leg 1 matches define the pairs — we find which pair a match belongs to
  // by matching the combination of home and away team IDs
  const getSemiFinalLabel = (match: any, allSemiFinals: any[]) => {
    const leg1Matches = allSemiFinals.filter((m) => (m.leg ?? 1) === 1);
    const pairIndex = leg1Matches.findIndex(
      (l1) =>
        (l1.home_team_id === match.home_team_id &&
          l1.away_team_id === match.away_team_id) ||
        (l1.home_team_id === match.away_team_id &&
          l1.away_team_id === match.home_team_id)
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          All Matches
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({totalMatches} total)
          </span>
        </h1>
        {/* Show which competition we're viewing */}
        {competition && (
          <p className="text-sm text-muted-foreground mt-1">
            {competition.name} · {competition.format}
          </p>
        )}
      </div>

      {/* ── Live matches ─────────────────────────────────────────────────
          Always shown at the top so viewers instantly see live action    */}
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
                      ? "🏆 Cup Final"
                      : m.match_type === "cup" && m.round === "playoff"
                      ? "4th Place Playoff"
                      : m.match_type === "cup"
                      ? getSemiFinalLabel(
                          m,
                          matches?.filter((x) => x.round === "semi_final") ?? []
                        )
                      : "League Match"
                  }
                />
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── League matches ───────────────────────────────────────────────
          Numbered Match 1, 2, 3 etc in chronological order
          Split into Upcoming and Results subsections                     */}
      {leagueMatches.length > 0 && (
        <section>
          <SectionHeader
            icon={<Calendar className="h-4 w-4 text-primary" />}
            title="League Matches"
            count={leagueMatches.length}
          />

          {/* Upcoming league matches */}
          {leagueMatches.filter((m) => m.status === "not_started").length >
            0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Upcoming
              </p>
              <div className="grid gap-3">
                {leagueMatches
                  .filter((m) => m.status === "not_started")
                  .map((m) => {
                    // Match number is consistent across both sections
                    // because we index from the full leagueMatches array
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
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Results
              </p>
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

      {/* ── Cup matches ──────────────────────────────────────────────────
          Shows in order: Playoff → Semi Finals → Final
          Cup section only renders if at least one cup match exists       */}
      {(playoffs.length > 0 || semiFinals.length > 0 || finals.length > 0) && (
        <section>
          <SectionHeader
            icon={<Trophy className="h-4 w-4 text-primary" />}
            title="Cup"
            count={playoffs.length + semiFinals.length + finals.length}
          />

          {/* Qualification playoff — only shown if it exists */}
          {playoffs.length > 0 && (
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
          )}

          {/* Semi finals — labelled by pair number and leg */}
          {semiFinals.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 px-1">
                Semi Finals
              </p>
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

          {/* Final — trophy emoji to make it stand out */}
          {finals.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 px-1">Final</p>
              <div className="grid gap-3">
                {finals.map((m) => (
                  <div key={m.id}>
                    <MatchLabel label="🏆 Cup Final" />
                    <MatchCard match={m} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────
          Only shown when there are genuinely no matches in this edition  */}
      {totalMatches === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No matches scheduled yet.
        </p>
      )}
    </div>
  );
}