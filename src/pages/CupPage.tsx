// CupPage.tsx
// Shows the knockout cup bracket for the active competition only
// Semi finals are played over two legs (home and away)
// The final is a single 15-minute match
// All data is scoped to the active competition — old competitions never bleed in

import { useQuery } from "@tanstack/react-query";
import { fetchMatches, fetchTeams, fetchActiveCompetition } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useMemo } from "react";
import MatchStatusBadge from "@/components/MatchStatusBadge";
import { Link } from "react-router-dom";

// Shape used for standings calculation to find top 4 qualifiers
type StandingRow = {
  teamId: string;
  teamName: string;
  points: number;
  gd: number;
  gf: number;
};

export default function CupPage() {
  // ── Step 1: fetch active competition ──────────────────────────────────
  // We need the competition ID to scope all queries below
  const { data: competition } = useQuery({
    queryKey: ["active-competition"],
    queryFn: fetchActiveCompetition,
  });

  const competitionId = competition?.id;

  // ── Step 2: fetch matches and teams for this competition only ──────────
  // enabled: !!competitionId prevents queries running before ID is ready
  const { data: matches } = useQuery({
    queryKey: ["matches", competitionId],
    queryFn: () => fetchMatches(competitionId),
    enabled: !!competitionId,
    refetchInterval: 5000, // refresh frequently during live cup matches
  });

  const { data: teams } = useQuery({
    queryKey: ["teams", competitionId],
    queryFn: () => fetchTeams(competitionId),
    enabled: !!competitionId,
  });

  // ── Calculate league standings to find top 4 qualifiers ───────────────
  // We calculate this from league matches only — cup matches are excluded
  // This lets us show the qualifiers panel even before cup matches are created
  const standings = useMemo(() => {
    if (!teams || !matches) return [];

    const map = new Map<string, StandingRow>();
    teams.forEach((t) =>
      map.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        points: 0,
        gd: 0,
        gf: 0,
      })
    );

    matches
      .filter((m) => m.status === "finished")
      // Only league matches count toward cup qualification
      .filter((m) => m.match_type === "league" || !m.match_type)
      .forEach((m) => {
        const home = map.get(m.home_team_id);
        const away = map.get(m.away_team_id);
        if (!home || !away) return;

        home.gf += m.home_score;
        home.gd += m.home_score - m.away_score;
        away.gf += m.away_score;
        away.gd += m.away_score - m.home_score;

        if (m.home_score > m.away_score) {
          home.points += 3;
        } else if (m.home_score < m.away_score) {
          away.points += 3;
        } else {
          home.points += 1;
          away.points += 1;
        }
      });

    return Array.from(map.values()).sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf
    );
  }, [matches, teams]);

  // Top 4 teams qualify for the cup
  const top4 = standings.slice(0, 4);

  // ── Separate cup matches by round ─────────────────────────────────────
  const cupMatches = useMemo(() => {
    if (!matches) return { semiFinals: [], final: [] };

    // Semi finals sorted by leg — leg 1 always before leg 2
    const semiFinals = matches
      .filter((m) => m.match_type === "cup" && m.round === "semi_final")
      .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1));

    const final = matches.filter(
      (m) => m.match_type === "cup" && m.round === "final"
    );

    return { semiFinals, final };
  }, [matches]);

  // ── Pair semi final legs together ─────────────────────────────────────
  // Leg 1: Team A (home) vs Team B (away)
  // Leg 2: Team B (home) vs Team A (away) — teams are reversed
  // We match them by checking if home/away team IDs are swapped between legs
  const semiFinalPairs = useMemo(() => {
    const { semiFinals } = cupMatches;
    const leg1Matches = semiFinals.filter((m) => m.leg === 1);
    const leg2Matches = semiFinals.filter((m) => m.leg === 2);

    return leg1Matches.map((l1) => {
      const l2 =
        leg2Matches.find(
          (m) =>
            m.home_team_id === l1.away_team_id &&
            m.away_team_id === l1.home_team_id
        ) ?? null;
      return { leg1: l1, leg2: l2 };
    });
  }, [cupMatches]);

  // ── Status helpers ────────────────────────────────────────────────────
  const getStatusLabel = (status: string) => {
    if (status === "finished") return "FT";
    if (status === "live") return "LIVE";
    if (status === "paused") return "Paused";
    return "TBD";
  };

  const getStatusColor = (status: string) => {
    if (status === "live") return "text-live animate-pulse";
    if (status === "finished") return "text-muted-foreground";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Cup Knockout
        </h1>
        {/* Show which competition we're viewing */}
        {competition && (
          <p className="text-sm text-muted-foreground mt-1">
            {competition.name} · {competition.format}
          </p>
        )}
      </div>

      {/* ── Cup qualifiers ───────────────────────────────────────────────
          Always shown so viewers know who made it from the league phase  */}
      {top4.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Cup Qualifiers — Top 4
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {top4.map((t, i) => (
              <Card key={t.teamId} className="p-3 flex items-center gap-3">
                {/* Rank badge */}
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{t.teamName}</p>
                  <p className="text-xs text-muted-foreground">{t.points} pts</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Qualification Playoff ────────────────────────────────────────
          Only shown if admin created a playoff match
          Used when two teams are level and need a decider for 4th spot   */}
      {(() => {
        const playoff =
          matches?.filter(
            (m) => m.match_type === "cup" && m.round === "playoff"
          ) ?? [];

        if (playoff.length === 0) return null;

        return (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Qualification Playoff
            </h2>
            {playoff.map((m) => (
              <Link key={m.id} to={`/match/${m.id}`}>
                <Card className="p-4 border-amber-500/30 hover:border-amber-500/60 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                      4th Place Playoff
                    </span>
                    <MatchStatusBadge status={m.status} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-right">
                      <p className="font-bold">{m.home_team.name}</p>
                      <p className="text-xs text-muted-foreground">Home</p>
                    </div>
                    <div className="text-center">
                      <div className="font-mono text-2xl font-bold">
                        {m.status === "not_started"
                          ? "– : –"
                          : `${m.home_score} : ${m.away_score}`}
                      </div>
                      <span
                        className={`text-xs font-semibold mt-1 block ${getStatusColor(m.status)}`}
                      >
                        {m.status === "finished"
                          ? "Full time"
                          : m.status === "live"
                          ? "Live now"
                          : "1 match"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{m.away_team.name}</p>
                      <p className="text-xs text-muted-foreground">Away</p>
                    </div>
                  </div>

                  {m.status !== "finished" && (
                    <p className="text-xs text-center text-muted-foreground mt-3 border-t border-border pt-3">
                      Winner advances to the cup semi finals
                    </p>
                  )}
                  {m.status === "finished" && (
                    <p className="text-xs text-center text-amber-500 mt-3 border-t border-border pt-3 font-semibold">
                      {m.home_score > m.away_score
                        ? `${m.home_team.name} advances`
                        : m.away_score > m.home_score
                        ? `${m.away_team.name} advances`
                        : "Replay required"}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        );
      })()}

      {/* ── Semi Finals ──────────────────────────────────────────────────
          Each pair shows both legs and the aggregate score when done     */}
      {semiFinalPairs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Semi Finals
          </h2>
          <div className="space-y-4">
            {semiFinalPairs.map((pair, i) => {
              const { leg1, leg2 } = pair;

              // Aggregate: leg1 home team's total = leg1 home score + leg2 away score
              // because in leg 2 the teams are swapped
              const team1Agg =
                (leg1.home_score ?? 0) + (leg2?.away_score ?? 0);
              const team2Agg =
                (leg1.away_score ?? 0) + (leg2?.home_score ?? 0);
              const bothLegsPlayed = leg2?.status === "finished";

              return (
                <Card key={i} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Semi Final {i + 1}
                    </span>
                    {/* Aggregate only shown after both legs are played */}
                    {bothLegsPlayed && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Agg: {team1Agg} – {team2Agg}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold">{leg1.home_team.name}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="font-bold">{leg1.away_team.name}</span>
                  </div>

                  {/* Leg 1 */}
                  <Link
                    to={`/match/${leg1.id}`}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 hover:bg-secondary/70 transition-colors"
                  >
                    <span className="text-xs font-semibold text-muted-foreground">
                      Leg 1
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm">
                        {leg1.status === "not_started"
                          ? "– : –"
                          : `${leg1.home_score} – ${leg1.away_score}`}
                      </span>
                      <span
                        className={`text-xs font-semibold ${getStatusColor(leg1.status)}`}
                      >
                        {getStatusLabel(leg1.status)}
                      </span>
                    </div>
                  </Link>

                  {/* Leg 2 — shows placeholder if not yet created by admin */}
                  {leg2 ? (
                    <Link
                      to={`/match/${leg2.id}`}
                      className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 hover:bg-secondary/70 transition-colors"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">
                        Leg 2
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm">
                          {leg2.status === "not_started"
                            ? "– : –"
                            : `${leg2.home_score} – ${leg2.away_score}`}
                        </span>
                        <span
                          className={`text-xs font-semibold ${getStatusColor(leg2.status)}`}
                        >
                          {getStatusLabel(leg2.status)}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Leg 2
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Not scheduled yet
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Final ────────────────────────────────────────────────────────
          Single 15-minute match — highlighted with primary border        */}
      {cupMatches.final.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Final
          </h2>
          {cupMatches.final.map((m) => (
            <Link key={m.id} to={`/match/${m.id}`}>
              <Card className="p-5 border-primary/30 hover:border-primary/60 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Cup Final
                  </span>
                  <MatchStatusBadge status={m.status} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 text-right">
                    <p className="font-bold">{m.home_team.name}</p>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-3xl font-bold">
                      {m.status === "not_started"
                        ? "– : –"
                        : `${m.home_score} : ${m.away_score}`}
                    </div>
                    <span
                      className={`text-xs font-semibold mt-1 block ${getStatusColor(m.status)}`}
                    >
                      {m.status === "finished"
                        ? "Full time"
                        : m.status === "live"
                        ? "Live now"
                        : "15 mins"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{m.away_team.name}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────
          Shown when league is still in progress and no cup matches exist */}
      {semiFinalPairs.length === 0 && cupMatches.final.length === 0 && (
        <Card className="p-10 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">
            Cup bracket not started yet
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            The top 4 teams from the league phase will advance to the semi finals.
          </p>
        </Card>
      )}
    </div>
  );
}