// CupPage.tsx
// Shows the knockout cup bracket for the top 4 teams from the league phase
// Semi finals are played over two legs (home and away)
// The final is a single match
// Admin creates cup matches the same way as league matches but selects "Cup" as match type

import { useQuery } from "@tanstack/react-query";
import { fetchMatches, fetchTeams } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useMemo } from "react";
import MatchStatusBadge from "@/components/MatchStatusBadge";
import { Link } from "react-router-dom";

// Shape of each row in the standings — used to determine top 4 qualifiers
type StandingRow = {
  teamId: string;
  teamName: string;
  points: number;
  gd: number;
  gf: number;
};

export default function CupPage() {
  // Fetch all matches — we need both league matches (for standings)
  // and cup matches (for the bracket)
  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    refetchInterval: 5000, // refresh frequently during live cup matches
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
  });

  // ── Calculate league standings to determine top 4 ──────────────────────────
  // We need the standings here so we can show who qualified for the cup
  // even before the admin has created the cup matches
  const standings = useMemo(() => {
    if (!teams || !matches) return [];

    const map = new Map<string, StandingRow>();
    teams.forEach((t) =>
      map.set(t.id, { teamId: t.id, teamName: t.name, points: 0, gd: 0, gf: 0 })
    );

    matches
      .filter((m) => m.status === "finished")
      .filter((m) => m.match_type === "league" || !m.match_type)
      .forEach((m) => {
        const home = map.get(m.home_team_id);
        const away = map.get(m.away_team_id);
        if (!home || !away) return;

        home.gf += m.home_score; home.gd += m.home_score - m.away_score;
        away.gf += m.away_score; away.gd += m.away_score - m.home_score;

        if (m.home_score > m.away_score) {
          home.points += 3;
        } else if (m.home_score < m.away_score) {
          away.points += 3;
        } else {
          home.points += 1; away.points += 1;
        }
      });

    return Array.from(map.values()).sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf
    );
  }, [matches, teams]);

  // Top 4 teams by points qualify for the cup
  const top4 = standings.slice(0, 4);

  // ── Separate cup matches from league matches ───────────────────────────────
  const cupMatches = useMemo(() => {
    if (!matches) return { semiFinals: [], final: [] };

    // Get all semi final matches sorted by leg number (leg 1 first, then leg 2)
    const semiFinals = matches
      .filter((m) => m.match_type === "cup" && m.round === "semi_final")
      .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1));

    // Get the final match
    const final = matches.filter((m) => m.match_type === "cup" && m.round === "final");

    return { semiFinals, final };
  }, [matches]);

  // ── Pair up semi final legs ────────────────────────────────────────────────
  // Leg 1: Team A (home) vs Team B (away)
  // Leg 2: Team B (home) vs Team A (away) — teams are swapped
  // We pair them by matching home/away teams across legs
  const semiFinalPairs = useMemo(() => {
    const { semiFinals } = cupMatches;
    const leg1Matches = semiFinals.filter((m) => m.leg === 1);
    const leg2Matches = semiFinals.filter((m) => m.leg === 2);

    return leg1Matches.map((l1) => {
      // Find the matching leg 2 — in leg 2 the home and away teams are reversed
      const l2 = leg2Matches.find(
        (m) =>
          m.home_team_id === l1.away_team_id &&
          m.away_team_id === l1.home_team_id
      );
      return { leg1: l1, leg2: l2 ?? null };
    });
  }, [cupMatches]);

  // ── Helper to get status label ─────────────────────────────────────────────
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
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        Cup Knockout
      </h1>

      {/* ── Cup qualifiers ──────────────────────────────────────────────────── */}
      {/* Always show the top 4 qualifiers so viewers know who made it */}
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


      {/* ── Qualification Playoff ───────────────────────────────────────────
          Only shown if a playoff match exists — used when two teams are
          level on points and need a single match to decide the 4th cup spot */}
      {(() => {
        const playoff = matches?.filter(
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
                    {/* Home team */}
                    <div className="flex-1 text-right">
                      <p className="font-bold">{m.home_team.name}</p>
                      <p className="text-xs text-muted-foreground">Home</p>
                    </div>
                    {/* Score */}
                    <div className="text-center">
                      <div className="font-mono text-2xl font-bold">
                        {m.status === "not_started"
                          ? "– : –"
                          : `${m.home_score} : ${m.away_score}`}
                      </div>
                      <span className={`text-xs font-semibold mt-1 block ${getStatusColor(m.status)}`}>
                        {m.status === "finished"
                          ? "Full time"
                          : m.status === "live"
                          ? "Live now"
                          : "1 match"}
                      </span>
                    </div>
                    {/* Away team */}
                    <div className="flex-1">
                      <p className="font-bold">{m.away_team.name}</p>
                      <p className="text-xs text-muted-foreground">Away</p>
                    </div>
                  </div>

                  {/* Winner advances message */}
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

      {/* ── Semi Finals ─────────────────────────────────────────────────────── */}
      {semiFinalPairs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Semi Finals
          </h2>
          <div className="space-y-4">
            {semiFinalPairs.map((pair, i) => {
              const { leg1, leg2 } = pair;

              // Calculate aggregate score across both legs
              // In leg 2 the teams are swapped so we need to flip the scores
              // Leg 1 home team's aggregate = leg1 home score + leg2 away score
              const team1Agg = (leg1.home_score ?? 0) + (leg2?.away_score ?? 0);
              const team2Agg = (leg1.away_score ?? 0) + (leg2?.home_score ?? 0);
              const bothLegsPlayed = leg2?.status === "finished";

              return (
                <Card key={i} className="p-4 space-y-3">
                  {/* Semi final header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Semi Final {i + 1}
                    </span>
                    {/* Only show aggregate once both legs are played */}
                    {bothLegsPlayed && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Agg: {team1Agg} – {team2Agg}
                      </span>
                    )}
                  </div>

                  {/* Teams row */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{leg1.home_team.name}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="font-bold">{leg1.away_team.name}</span>
                  </div>

                  {/* Leg 1 result */}
                  <Link
                    to={`/match/${leg1.id}`}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 hover:bg-secondary/70 transition-colors"
                  >
                    <span className="text-xs font-semibold text-muted-foreground">Leg 1</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm">
                        {leg1.status === "not_started"
                          ? "– : –"
                          : `${leg1.home_score} – ${leg1.away_score}`}
                      </span>
                      <span className={`text-xs font-semibold ${getStatusColor(leg1.status)}`}>
                        {getStatusLabel(leg1.status)}
                      </span>
                    </div>
                  </Link>

                  {/* Leg 2 result — shows TBD if not created yet */}
                  {leg2 ? (
                    <Link
                      to={`/match/${leg2.id}`}
                      className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 hover:bg-secondary/70 transition-colors"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">Leg 2</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm">
                          {leg2.status === "not_started"
                            ? "– : –"
                            : `${leg2.home_score} – ${leg2.away_score}`}
                        </span>
                        <span className={`text-xs font-semibold ${getStatusColor(leg2.status)}`}>
                          {getStatusLabel(leg2.status)}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    // Leg 2 not yet created by admin
                    <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-2.5">
                      <span className="text-xs font-semibold text-muted-foreground">Leg 2</span>
                      <span className="text-xs text-muted-foreground">Not scheduled yet</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Final ───────────────────────────────────────────────────────────── */}
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
                  {/* Home team */}
                  <div className="flex-1 text-right">
                    <p className="font-bold">{m.home_team.name}</p>
                  </div>
                  {/* Score */}
                  <div className="text-center">
                    <div className="font-mono text-3xl font-bold">
                      {m.status === "not_started"
                        ? "– : –"
                        : `${m.home_score} : ${m.away_score}`}
                    </div>
                    <span className={`text-xs font-semibold mt-1 block ${getStatusColor(m.status)}`}>
                      {m.status === "finished"
                        ? "Full time"
                        : m.status === "live"
                        ? "Live now"
                        : "15 mins"}
                    </span>
                  </div>
                  {/* Away team */}
                  <div className="flex-1">
                    <p className="font-bold">{m.away_team.name}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {/* Shown when the league isn't finished yet and no cup matches exist */}
      {semiFinalPairs.length === 0 && cupMatches.final.length === 0 && (
        <Card className="p-10 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">Cup bracket not started yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            The top 4 teams from the league phase will advance to the semi finals.
          </p>
        </Card>
      )}
    </div>
  );
}