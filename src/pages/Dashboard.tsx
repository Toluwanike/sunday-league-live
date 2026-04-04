// Dashboard.tsx
// Main homepage — shows live matches, countdown, quick stats, form table and recent results

import { useQuery } from "@tanstack/react-query";
import { fetchMatches } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import MatchCard from "@/components/MatchCard";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, Calendar, CheckCircle, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerStat = {
  name: string;
  team_name: string;
  goals: number;
  assists: number;
};

type TeamForm = {
  id: string;
  name: string;
  form: ("W" | "D" | "L")[];
  points: number;
};

type RawPlayer = { id: string; name: string; team: { name: string } | null };
type RawEvent = { player_id: string; assist_player_id: string | null; event_type: string };

// ─── Countdown Hook ───────────────────────────────────────────────────────────
// Calculates time remaining until a given date and updates every second
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { clearInterval(interval); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// ─── Fetch player stats ───────────────────────────────────────────────────────
async function fetchStats(): Promise<PlayerStat[]> {
  const { data: players } = await supabase.from("players").select("id, name, team:teams(name)");
  const { data: events } = await supabase.from("match_events").select("player_id, assist_player_id, event_type");

  const stats = new Map<string, PlayerStat>();
  (players as RawPlayer[])?.forEach((p) => {
    stats.set(p.id, { name: p.name, team_name: p.team?.name ?? "", goals: 0, assists: 0 });
  });
  (events as RawEvent[])?.forEach((e) => {
    if (e.event_type === "goal") {
      const scorer = stats.get(e.player_id);
      if (scorer) scorer.goals++;
      if (e.assist_player_id) {
        const assister = stats.get(e.assist_player_id);
        if (assister) assister.assists++;
      }
    }
  });
  return Array.from(stats.values()).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

export default function Dashboard() {
  // ─── Data fetching ──────────────────────────────────────────────────────────
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    refetchInterval: 5000,
  });

  const { data: playerStats } = useQuery({
    queryKey: ["player-stats-dash"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  // ─── Split matches by status ────────────────────────────────────────────────
  const liveMatches = matches?.filter((m) => m.status === "live" || m.status === "halftime") ?? [];
  const upcoming = [...(matches?.filter((m) => m.status === "not_started") ?? [])]
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  const finished = matches?.filter((m) => m.status === "finished") ?? [];
  const recentResults = [...finished]
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    .slice(0, 3);

  // ─── Next match for countdown ───────────────────────────────────────────────
  const nextMatch = upcoming[0] ?? null;
  const countdown = useCountdown(nextMatch?.match_date ?? null);
  const isToday = nextMatch
    ? new Date(nextMatch.match_date).toDateString() === new Date().toDateString()
    : false;

  // ─── Quick stats ────────────────────────────────────────────────────────────
  const totalGoals = playerStats?.reduce((sum, p) => sum + p.goals, 0) ?? 0;
  const topScorer = playerStats?.find((p) => p.goals > 0) ?? null;
  const topAssister = [...(playerStats ?? [])].sort((a, b) => b.assists - a.assists).find((p) => p.assists > 0) ?? null;
  const totalMatchesPlayed = finished.length;

  // ─── Team form table ────────────────────────────────────────────────────────
  // Build a W/D/L form for each team from finished matches
  const teamFormMap = new Map<string, TeamForm>();
  matches?.forEach((m) => {
    // Register both teams
    if (!teamFormMap.has(m.home_team_id)) {
      teamFormMap.set(m.home_team_id, { id: m.home_team_id, name: m.home_team.name, form: [], points: 0 });
    }
    if (!teamFormMap.has(m.away_team_id)) {
      teamFormMap.set(m.away_team_id, { id: m.away_team_id, name: m.away_team.name, form: [], points: 0 });
    }

    if (m.status === "finished") {
      const home = teamFormMap.get(m.home_team_id)!;
      const away = teamFormMap.get(m.away_team_id)!;
      if (m.home_score > m.away_score) {
        home.form.push("W"); home.points += 3;
        away.form.push("L");
      } else if (m.home_score < m.away_score) {
        away.form.push("W"); away.points += 3;
        home.form.push("L");
      } else {
        home.form.push("D"); home.points += 1;
        away.form.push("D"); away.points += 1;
      }
    }
  });

  // Sort teams by points, take last 3 form results per team
  const teamForm = Array.from(teamFormMap.values())
    .sort((a, b) => b.points - a.points)
    .map((t) => ({ ...t, form: t.form.slice(-3) }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-pitch flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Talksport League
        </h1>
        <p className="text-muted-foreground mt-1">Live scores, results & stats</p>
      </div>

      {/* ── Live Match ─────────────────────────────────────────────────────── */}
      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-live animate-pulse" />
            Live Now
          </h2>
          <div className="grid gap-3">
            {liveMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* ── Countdown to next match ─────────────────────────────────────────── */}
      {nextMatch && liveMatches.length === 0 && (
        <Card className="p-5 border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Next Match
            </p>
          </div>
          <p className="font-bold text-lg mb-4">
            {nextMatch.home_team.name} vs {nextMatch.away_team.name}
          </p>

          {isToday ? (
            // Show "Today!" banner if the match is today
            <div className="bg-primary/10 text-primary rounded-lg p-3 text-center font-bold text-lg">
              Match day is today!
            </div>
          ) : (
            // Show countdown timer
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Days", value: countdown.days },
                { label: "Hours", value: countdown.hours },
                { label: "Mins", value: countdown.minutes },
                { label: "Secs", value: countdown.seconds },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary rounded-lg p-3">
                  <p className="text-2xl font-bold font-mono">
                    {String(value).padStart(2, "0")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Quick Stats Strip ───────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

          {/* Total goals */}
          <Card className="p-4 text-center">
            <Target className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalGoals}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Goals</p>
          </Card>

          {/* Matches played */}
          <Card className="p-4 text-center">
            <CheckCircle className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalMatchesPlayed}</p>
            <p className="text-xs text-muted-foreground mt-1">Matches Played</p>
          </Card>

          {/* Top scorer */}
          <Card className="p-4 text-center">
            <p className="text-lg mb-1">⚽</p>
            <p className="text-sm font-bold truncate">{topScorer?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {topScorer ? `${topScorer.goals} goals` : "No goals yet"}
            </p>
          </Card>

          {/* Top assister */}
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold truncate">{topAssister?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {topAssister ? `${topAssister.assists} assists` : "No assists yet"}
            </p>
          </Card>

        </div>
      </section>

      {/* ── Team Form Table ─────────────────────────────────────────────────── */}
      {teamForm.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Team Form</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Team</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Pts</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Last 3</th>
                </tr>
              </thead>
              <tbody>
                {teamForm.map((t, i) => (
                  <tr key={t.id} className="border-b border-border/50">
                    {/* Rank + team name */}
                    <td className="p-3 font-medium flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      {t.name}
                    </td>
                    {/* Points */}
                    <td className="text-center p-3 font-bold">{t.points}</td>
                    {/* Form pills — W/D/L */}
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {t.form.length === 0 && (
                          <span className="text-xs text-muted-foreground">No games</span>
                        )}
                        {t.form.map((result, idx) => (
                          <span
                            key={idx}
                            className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                              result === "W" ? "bg-green-600" :
                              result === "D" ? "bg-gray-500" :
                              "bg-red-500"
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
        </section>
      )}

      {/* ── Recent Results ──────────────────────────────────────────────────── */}
      {recentResults.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Recent Results
          </h2>
          <div className="grid gap-3">
            {recentResults.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {!matches?.length && (
        <div className="text-center py-16">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground">No matches yet</h2>
          <p className="text-muted-foreground/60 mt-1">Check back on match day!</p>
        </div>
      )}
    </div>
  );
}