// Dashboard.tsx
// Main landing page for the active competition
// Shows: competition banner, next match countdown, quick stats,
// live matches, team form table and recent results
// All data is scoped to the active competition only

import { useQuery } from "@tanstack/react-query";
import {
  fetchMatches,
  fetchTeams,
  fetchAllEvents,
  fetchActiveCompetition,
} from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Trophy, Zap, Target, CheckCircle, Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ── Countdown timer ────────────────────────────────────────────────────────
// Ticks every second and counts down to the next match date
function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="grid grid-cols-4 gap-2 mt-4">
      {[
        { label: "Days", value: timeLeft.days },
        { label: "Hours", value: timeLeft.hours },
        { label: "Mins", value: timeLeft.mins },
        { label: "Secs", value: timeLeft.secs },
      ].map(({ label, value }) => (
        <div key={label} className="bg-secondary/50 rounded-lg p-3 text-center">
          <div className="font-mono text-2xl font-bold">{pad(value)}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="p-4 flex flex-col items-center justify-center text-center gap-1">
      <div className="text-primary mb-1">{icon}</div>
      <div className="text-2xl font-bold font-mono truncate w-full text-center">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

export default function Dashboard() {
  // ── Step 1: fetch the active competition first ─────────────────────────
  // Everything else is scoped to this competition's ID
  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ["active-competition"],
    queryFn: fetchActiveCompetition,
    refetchInterval: 30000, // check every 30s in case admin switches competition
  });

  const competitionId = competition?.id;

  // ── Step 2: fetch all data scoped to this competition ─────────────────
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", competitionId],
    queryFn: () => fetchMatches(competitionId),
    enabled: !!competitionId, // don't fetch until we have a competition ID
    refetchInterval: 5000,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams", competitionId],
    queryFn: () => fetchTeams(competitionId),
    enabled: !!competitionId,
  });

  // fetchAllEvents gets events for all matches in this competition
  // This is what powers the total goals, top scorer and top assist stats
  const { data: events } = useQuery({
    queryKey: ["all-events", competitionId],
    queryFn: () => fetchAllEvents(competitionId),
    enabled: !!competitionId,
    refetchInterval: 10000,
  });

  // ── Derived match lists ────────────────────────────────────────────────
  const liveMatches = matches?.filter(
    (m) => m.status === "live" || m.status === "paused"
  ) ?? [];

  // Next upcoming match — soonest not_started match chronologically
  const nextMatch = matches
    ?.filter((m) => m.status === "not_started")
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )[0];

  // Last 5 finished matches most recent first
  const recentMatches =
    matches
      ?.filter((m) => m.status === "finished")
      .sort(
        (a, b) =>
          new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      )
      .slice(0, 5) ?? [];

  // ── Quick stats ────────────────────────────────────────────────────────
  // Count all goal events — this is now correctly scoped to the competition
  const totalGoals =
    events?.filter((e: any) => e.event_type === "goal").length ?? 0;

  const matchesPlayed =
    matches?.filter((m) => m.status === "finished").length ?? 0;

  // Top scorer — player with the most goal events in this competition
  const topScorer = useMemo(() => {
    if (!events) return null;
    const goalMap = new Map<string, { name: string; goals: number }>();
    events
      .filter((e: any) => e.event_type === "goal")
      .forEach((e: any) => {
        const existing = goalMap.get(e.player_id) ?? {
          name: e.player?.name ?? "Unknown",
          goals: 0,
        };
        goalMap.set(e.player_id, { ...existing, goals: existing.goals + 1 });
      });
    return (
      Array.from(goalMap.values()).sort((a, b) => b.goals - a.goals)[0] ?? null
    );
  }, [events]);

  // Top assist provider — player linked as assist_player_id on goal events
  const topAssist = useMemo(() => {
    if (!events) return null;
    const assistMap = new Map<string, { name: string; assists: number }>();
    events
      .filter((e: any) => e.event_type === "goal" && e.assist_player_id)
      .forEach((e: any) => {
        const existing = assistMap.get(e.assist_player_id) ?? {
          name: e.assist_player?.name ?? "Unknown",
          assists: 0,
        };
        assistMap.set(e.assist_player_id, {
          ...existing,
          assists: existing.assists + 1,
        });
      });
    return (
      Array.from(assistMap.values()).sort(
        (a, b) => b.assists - a.assists
      )[0] ?? null
    );
  }, [events]);

  // ── Team form table ────────────────────────────────────────────────────
  // Points and last 3 results per team — league matches only
  const teamForm = useMemo(() => {
    if (!teams || !matches) return [];
    return teams
      .map((team) => {
        const teamMatches = matches
          .filter(
            (m) =>
              m.status === "finished" &&
              (m.match_type === "league" || !m.match_type) &&
              (m.home_team_id === team.id || m.away_team_id === team.id)
          )
          .sort(
            (a, b) =>
              new Date(b.match_date).getTime() -
              new Date(a.match_date).getTime()
          );

        let points = 0;
        teamMatches.forEach((m) => {
          const isHome = m.home_team_id === team.id;
          const scored = isHome ? m.home_score : m.away_score;
          const conceded = isHome ? m.away_score : m.home_score;
          if (scored > conceded) points += 3;
          else if (scored === conceded) points += 1;
        });

        // Last 3 results as W/D/L strings
        const last3 = teamMatches.slice(0, 3).map((m) => {
          const isHome = m.home_team_id === team.id;
          const scored = isHome ? m.home_score : m.away_score;
          const conceded = isHome ? m.away_score : m.home_score;
          if (scored > conceded) return "W";
          if (scored < conceded) return "L";
          return "D";
        });

        return { id: team.id, name: team.name, points, last3 };
      })
      .sort((a, b) => b.points - a.points);
  }, [teams, matches]);

  const isLoading = compLoading || matchesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Talksport League
        </h1>
        <p className="text-muted-foreground mt-1">
          Live scores, standings & stats
        </p>
      </div>

      {/* ── Competition banner ───────────────────────────────────────────
          Only shown when admin has toggled show_banner = true
          Shows the competition name and format e.g. "The Founding Season — 5-a-side" */}
      {competition?.show_banner && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex items-center gap-3">
          <Trophy className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-sm text-primary">
              {competition.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {competition.format} · Now Active
            </p>
          </div>
        </div>
      )}

      {/* ── Next match countdown ─────────────────────────────────────────
          Only shown when there is a scheduled upcoming match             */}
      {nextMatch && (
        <Card className="p-5 border-primary/20">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <Calendar className="h-3.5 w-3.5" />
            Next Match
          </div>
          <p className="font-bold text-lg">
            {nextMatch.home_team.name} vs {nextMatch.away_team.name}
          </p>
          <Countdown targetDate={nextMatch.match_date} />
        </Card>
      )}

      {/* ── Quick stats strip ────────────────────────────────────────────
          All four stats are now correctly scoped to the active competition
          Previously fetchMatchEvents() was called without a matchId
          which caused it to return nothing — now fixed via fetchAllEvents() */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Target className="h-5 w-5" />}
          value={totalGoals}
          label="Total Goals"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          value={matchesPlayed}
          label="Matches Played"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={topScorer?.name ?? "—"}
          label={topScorer ? `${topScorer.goals} goals` : "Top Scorer"}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={topAssist?.name ?? "—"}
          label={
            topAssist ? `${topAssist.assists} assists` : "No assists yet"
          }
        />
      </div>

      {/* ── Live matches ─────────────────────────────────────────────────
          Shown prominently when any match is currently in progress       */}
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

      {/* ── Team form table ──────────────────────────────────────────────
          Sorted by points, shows last 3 results as W/D/L badges         */}
      {teamForm.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Team Form</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 font-medium text-muted-foreground w-8">
                    #
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Team
                  </th>
                  <th className="text-center p-3 font-medium text-muted-foreground">
                    Pts
                  </th>
                  <th className="text-right p-3 font-medium text-muted-foreground">
                    Last 3
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamForm.map((team, i) => (
                  <tr
                    key={team.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="p-3 font-mono text-muted-foreground text-xs">
                      {i + 1}
                    </td>
                    <td className="p-3 font-semibold">{team.name}</td>
                    <td className="text-center p-3 font-mono font-bold text-primary">
                      {team.points}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {team.last3.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            No results
                          </span>
                        )}
                        {team.last3.map((result, j) => (
                          <span
                            key={j}
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                              result === "W"
                                ? "bg-primary text-primary-foreground"
                                : result === "D"
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-live/20 text-live"
                            }`}
                          >
                            {result}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Link
            to="/standings"
            className="text-xs text-primary hover:underline mt-2 block text-right"
          >
            View full standings →
          </Link>
        </section>
      )}

      {/* ── Recent results ───────────────────────────────────────────────
          Last 5 finished matches most recent first                       */}
      {recentMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Results</h2>
          <div className="grid gap-3">
            {recentMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
          <Link
            to="/matches"
            className="text-xs text-primary hover:underline mt-2 block text-right"
          >
            View all matches →
          </Link>
        </section>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────
          Only shown when there are no matches at all in this competition */}
      {!matches?.length && (
        <div className="text-center py-16">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            No matches yet
          </h2>
          <p className="text-muted-foreground/60 mt-1">
            Log in as admin to create your first match
          </p>
        </div>
      )}
    </div>
  );
}