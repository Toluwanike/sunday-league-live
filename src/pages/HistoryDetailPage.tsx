// HistoryDetailPage.tsx
// Shows the full detail view for a specific past (or active) competition
// Includes: final standings, cup results, top scorer, top assister, all matches
// Accessed via /history/:id

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCompetition,
  fetchMatches,
  fetchTeams,
  fetchAllEvents,
} from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Trophy, Shield, Star, ArrowLeft, CircleDot } from "lucide-react";
import { useMemo } from "react";
import MatchCard from "@/components/MatchCard";

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

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Fetch this specific competition by ID
  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ["competition", id],
    queryFn: () => fetchCompetition(id!),
    enabled: !!id,
  });

  // Fetch all matches for this competition
  const { data: matches } = useQuery({
    queryKey: ["matches", id],
    queryFn: () => fetchMatches(id),
    enabled: !!id,
  });

  // Fetch all teams for this competition
  const { data: teams } = useQuery({
    queryKey: ["teams", id],
    queryFn: () => fetchTeams(id),
    enabled: !!id,
  });

  // Fetch all events for this competition — for top scorer and top assister
  const { data: events } = useQuery({
    queryKey: ["all-events", id],
    queryFn: () => fetchAllEvents(id),
    enabled: !!id,
  });

  // ── Calculate final standings ──────────────────────────────────────────
  const standings = useMemo(() => {
    if (!teams || !matches) return [];

    const map = new Map<string, StandingRow>();
    teams.forEach((t) =>
      map.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
      })
    );

    matches
      .filter((m) => m.status === "finished")
      // Only league matches count toward standings — exclude cup
      .filter((m) => m.match_type === "league" || !m.match_type)
      .forEach((m) => {
        const home = map.get(m.home_team_id);
        const away = map.get(m.away_team_id);
        if (!home || !away) return;

        home.played++; away.played++;
        home.gf += m.home_score; home.ga += m.away_score;
        away.gf += m.away_score; away.ga += m.home_score;

        if (m.home_score > m.away_score) {
          home.won++; home.points += 3; away.lost++;
        } else if (m.home_score < m.away_score) {
          away.won++; away.points += 3; home.lost++;
        } else {
          home.drawn++; away.drawn++;
          home.points += 1; away.points += 1;
        }

        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
      });

    return Array.from(map.values()).sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf
    );
  }, [matches, teams]);

  // ── Top scorer ─────────────────────────────────────────────────────────
  const topScorer = useMemo(() => {
    if (!events) return null;
    const map = new Map<string, { name: string; goals: number }>();
    events
      .filter((e: any) => e.event_type === "goal")
      .forEach((e: any) => {
        const existing = map.get(e.player_id) ?? {
          name: e.player?.name ?? "Unknown",
          goals: 0,
        };
        map.set(e.player_id, { ...existing, goals: existing.goals + 1 });
      });
    return Array.from(map.values()).sort((a, b) => b.goals - a.goals)[0] ?? null;
  }, [events]);

  // ── Top assister ───────────────────────────────────────────────────────
  const topAssist = useMemo(() => {
    if (!events) return null;
    const map = new Map<string, { name: string; assists: number }>();
    events
      .filter((e: any) => e.event_type === "goal" && e.assist_player_id)
      .forEach((e: any) => {
        const existing = map.get(e.assist_player_id) ?? {
          name: e.assist_player?.name ?? "Unknown",
          assists: 0,
        };
        map.set(e.assist_player_id, {
          ...existing,
          assists: existing.assists + 1,
        });
      });
    return (
      Array.from(map.values()).sort((a, b) => b.assists - a.assists)[0] ?? null
    );
  }, [events]);

  // ── Cup matches ────────────────────────────────────────────────────────
  const cupFinal = matches?.find(
    (m) => m.match_type === "cup" && m.round === "final"
  );
  const semiFinals = matches?.filter(
    (m) => m.match_type === "cup" && m.round === "semi_final"
  );
  const finishedLeagueMatches = matches
    ?.filter((m) => m.status === "finished" && (m.match_type === "league" || !m.match_type))
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

  if (compLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Competition not found.</p>
        <Link to="/history" className="text-primary text-sm hover:underline mt-2 block">
          ← Back to History
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <Link
        to="/history"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to History
      </Link>

      {/* ── Competition header ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{competition.name}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            competition.status === "active"
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground"
          }`}>
            {competition.status === "active" ? "Active" : "Completed"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{competition.format}</p>
      </div>

      {/* ── Winners banner — only shown for completed competitions ──────── */}
      {competition.status === "completed" && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                League Winner
              </span>
            </div>
            <p className="font-bold text-lg">
              {competition.league_winner?.name ?? "TBD"}
            </p>
          </Card>
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cup Winner
              </span>
            </div>
            <p className="font-bold text-lg">
              {competition.cup_winner?.name ?? "TBD"}
            </p>
          </Card>
        </div>
      )}

      {/* ── Quick stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold font-mono text-primary">
            {matches?.filter((m) => m.status === "finished").length ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Matches Played</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold font-mono text-primary">
            {events?.filter((e: any) => e.event_type === "goal").length ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total Goals</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-lg font-bold text-primary truncate">
            {topScorer?.name ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {topScorer ? `Top Scorer · ${topScorer.goals} goals` : "Top Scorer"}
          </div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-lg font-bold text-primary truncate">
            {topAssist?.name ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {topAssist
              ? `Top Assist · ${topAssist.assists} assists`
              : "Top Assist"}
          </div>
        </Card>
      </div>

      {/* ── Final standings table ─────────────────────────────────────────── */}
      {standings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Final Standings
          </h2>
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
                    <th className="text-center p-3 font-medium text-muted-foreground">GD</th>
                    <th className="text-center p-3 font-semibold text-foreground">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => (
                    <tr
                      key={row.teamId}
                      className={`border-b border-border/50 transition-colors ${
                        i === 0 ? "bg-primary/5" : "hover:bg-secondary/30"
                      }`}
                    >
                      <td className="p-3 font-mono text-muted-foreground">
                        {/* Gold trophy for the winner */}
                        {i === 0 ? "🏆" : i + 1}
                      </td>
                      <td className="p-3 font-semibold">{row.teamName}</td>
                      <td className="text-center p-3 font-mono">{row.played}</td>
                      <td className="text-center p-3 font-mono">{row.won}</td>
                      <td className="text-center p-3 font-mono">{row.drawn}</td>
                      <td className="text-center p-3 font-mono">{row.lost}</td>
                      <td className="text-center p-3 font-mono">
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </td>
                      <td className="text-center p-3 font-mono font-bold text-primary">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── Cup final result ──────────────────────────────────────────────── */}
      {cupFinal && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Cup Final
          </h2>
          <Link to={`/match/${cupFinal.id}`}>
            <Card className="p-5 border-primary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-right">
                  <p className="font-bold">{cupFinal.home_team.name}</p>
                </div>
                <div className="text-center">
                  <div className="font-mono text-3xl font-bold">
                    {cupFinal.home_score} : {cupFinal.away_score}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Full Time</p>
                </div>
                <div className="flex-1">
                  <p className="font-bold">{cupFinal.away_team.name}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* ── Semi final results ────────────────────────────────────────────── */}
      {semiFinals && semiFinals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Semi Finals</h2>
          <div className="grid gap-3">
            {semiFinals.map((m, i) => (
              <div key={m.id}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                  Semi Final — Leg {m.leg ?? i + 1}
                </p>
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All league results ────────────────────────────────────────────── */}
      {finishedLeagueMatches && finishedLeagueMatches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-primary" />
            League Results
          </h2>
          <div className="grid gap-3">
            {finishedLeagueMatches.map((m, i) => (
              <div key={m.id}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                  Match {finishedLeagueMatches.length - i}
                </p>
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}