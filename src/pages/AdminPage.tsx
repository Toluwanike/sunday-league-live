// AdminPage.tsx
// Admin panel for managing the Talksport League
// Protected by Supabase auth — shows a login form if not authenticated
// All data is scoped to the active competition

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, fetchPlayers, fetchMatches, fetchActiveCompetition } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Play, Pause, Square, CircleDot, Shield, Users, Trophy } from "lucide-react";
import type { MatchStatus, EventType } from "@/lib/supabase-helpers";
import MatchStatusBadge from "@/components/MatchStatusBadge";
import { supabase } from "@/integrations/supabase/client";

// ── Login form ─────────────────────────────────────────────────────────────
// Shown when admin is not logged in
// Uses Supabase email/password auth
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError("Incorrect email or password.");
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Talksport League</p>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // Allow pressing Enter to submit
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button onClick={handleLogin} className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Admin page ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const queryClient = useQueryClient();

  // ── Auth state ─────────────────────────────────────────────────────────
  // isChecking prevents flash of login form before session loads
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
      setIsChecking(false);
    });
    // Listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
      }
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Active competition ─────────────────────────────────────────────────
  // All teams, players and matches are scoped to this competition
  const { data: competition } = useQuery({
    queryKey: ["active-competition"],
    queryFn: fetchActiveCompetition,
    enabled: isLoggedIn,
  });

  const competitionId = competition?.id;

  // ── Data queries — only run when logged in and competition ID is ready ──
  const { data: teams } = useQuery({
    queryKey: ["teams", competitionId],
    queryFn: () => fetchTeams(competitionId),
    enabled: isLoggedIn && !!competitionId,
  });

  const { data: matches } = useQuery({
    queryKey: ["matches", competitionId],
    queryFn: () => fetchMatches(competitionId),
    enabled: isLoggedIn && !!competitionId,
  });

  const { data: players } = useQuery({
    queryKey: ["players", competitionId],
    queryFn: () => fetchPlayers(undefined, competitionId),
    enabled: isLoggedIn && !!competitionId,
  });

  // ── Auth loading state ─────────────────────────────────────────────────
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ── Not logged in — show login form ────────────────────────────────────
  if (!isLoggedIn) {
    return <LoginForm />;
  }

  // ── Team management ────────────────────────────────────────────────────
  const [newTeamName, setNewTeamName] = useState("");
  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    // Link the new team to the active competition
    const { error } = await supabase.from("teams").insert({
      name: newTeamName.trim(),
      competition_id: competitionId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Team added!");
      setNewTeamName("");
      queryClient.invalidateQueries({ queryKey: ["teams", competitionId] });
    }
  };

  // ── Player management ──────────────────────────────────────────────────
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("");

  const addPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerTeam) return;
    // Link the new player to the active competition
    const { error } = await supabase.from("players").insert({
      name: newPlayerName.trim(),
      team_id: newPlayerTeam,
      jersey_number: newPlayerNumber ? parseInt(newPlayerNumber) : null,
      competition_id: competitionId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Player added!");
      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerPosition("");
      queryClient.invalidateQueries({ queryKey: ["players", competitionId] });
    }
  };

  // ── Match management ───────────────────────────────────────────────────
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchType, setMatchType] = useState("league");
  const [matchRound, setMatchRound] = useState("");
  const [matchLeg, setMatchLeg] = useState("");

  const createMatch = async () => {
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      toast.error("Select two different teams");
      return;
    }
    // Link the new match to the active competition
    const { error } = await supabase.from("matches").insert({
      home_team_id: homeTeam,
      away_team_id: awayTeam,
      match_date: matchDate || new Date().toISOString(),
      match_type: matchType,
      round: matchRound || null,
      leg: matchLeg ? parseInt(matchLeg) : null,
      competition_id: competitionId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Match created!");
      setHomeTeam("");
      setAwayTeam("");
      setMatchDate("");
      setMatchRound("");
      setMatchLeg("");
      queryClient.invalidateQueries({ queryKey: ["matches", competitionId] });
    }
  };

  const updateMatchStatus = async (matchId: string, status: MatchStatus) => {
    const { error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", matchId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["matches", competitionId] });
  };

  // ── Event recording ────────────────────────────────────────────────────
  const [eventMatch, setEventMatch] = useState("");
  const [eventType, setEventType] = useState<EventType>("goal");
  const [eventPlayer, setEventPlayer] = useState("");
  const [eventAssist, setEventAssist] = useState("");
  const [eventMinute, setEventMinute] = useState("");

  const selectedMatch = matches?.find((m) => m.id === eventMatch);

  // Only show players from the two teams in the selected match
  const matchPlayers =
    players?.filter(
      (p: any) =>
        selectedMatch &&
        (p.team_id === selectedMatch.home_team_id ||
          p.team_id === selectedMatch.away_team_id)
    ) ?? [];

  const recordEvent = async () => {
    if (!eventMatch || !eventPlayer || !eventMinute) {
      toast.error("Fill in all fields");
      return;
    }
    const { error } = await supabase.from("match_events").insert({
      match_id: eventMatch,
      event_type: eventType,
      player_id: eventPlayer,
      assist_player_id: eventAssist || null,
      minute: parseInt(eventMinute),
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    // If a goal was recorded, increment the score for the correct team
    if (eventType === "goal" && selectedMatch) {
      const scoringPlayer = players?.find((p: any) => p.id === eventPlayer);
      if (scoringPlayer) {
        const isHome =
          (scoringPlayer as any).team_id === selectedMatch.home_team_id;
        await supabase
          .from("matches")
          .update(
            isHome
              ? { home_score: selectedMatch.home_score + 1 }
              : { away_score: selectedMatch.away_score + 1 }
          )
          .eq("id", eventMatch);
      }
    }

    toast.success("Event recorded!");
    setEventMinute("");
    setEventPlayer("");
    setEventAssist("");
    queryClient.invalidateQueries({ queryKey: ["matches", competitionId] });
    queryClient.invalidateQueries({ queryKey: ["match-events"] });
    queryClient.invalidateQueries({ queryKey: ["all-events", competitionId] });
  };

  // Matches available for controls and event recording
  const liveMatches =
    matches?.filter(
      (m) => m.status === "live" || m.status === "paused"
    ) ?? [];
  const notStarted = matches?.filter((m) => m.status === "not_started") ?? [];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        {/* Show which competition is active */}
        {competition && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
            {competition.name}
          </span>
        )}
      </div>

      {/* ── Add Team ───────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Add Team
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTeam()}
          />
          <Button onClick={addTeam} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* ── Add Player ─────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Add Player
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
          />
          <Select value={newPlayerTeam} onValueChange={setNewPlayerTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Jersey number"
            type="number"
            value={newPlayerNumber}
            onChange={(e) => setNewPlayerNumber(e.target.value)}
          />
          <Input
            placeholder="Position"
            value={newPlayerPosition}
            onChange={(e) => setNewPlayerPosition(e.target.value)}
          />
        </div>
        <Button onClick={addPlayer} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Player
        </Button>
      </Card>

      {/* ── Create Match ───────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Create Match</h2>
        <div className="grid grid-cols-2 gap-2">
          <Select value={homeTeam} onValueChange={setHomeTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Home team" />
            </SelectTrigger>
            <SelectContent>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={awayTeam} onValueChange={setAwayTeam}>
            <SelectTrigger>
              <SelectValue placeholder="Away team" />
            </SelectTrigger>
            <SelectContent>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Match date and time */}
        <Input
          type="datetime-local"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
        />

        {/* Match type — league or cup */}
        <Select value={matchType} onValueChange={setMatchType}>
          <SelectTrigger>
            <SelectValue placeholder="Match type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="league">League</SelectItem>
            <SelectItem value="cup">Cup</SelectItem>
          </SelectContent>
        </Select>

        {/* Cup-specific fields — only shown for cup matches */}
        {matchType === "cup" && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={matchRound} onValueChange={setMatchRound}>
              <SelectTrigger>
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="playoff">Qualification Playoff</SelectItem>
                <SelectItem value="semi_final">Semi Final</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
            {/* Leg only needed for semi finals */}
            {matchRound === "semi_final" && (
              <Select value={matchLeg} onValueChange={setMatchLeg}>
                <SelectTrigger>
                  <SelectValue placeholder="Leg" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Leg 1</SelectItem>
                  <SelectItem value="2">Leg 2</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <Button onClick={createMatch} className="w-full">
          Create Match
        </Button>
      </Card>

      {/* ── Match Controls ─────────────────────────────────────────────── */}
      {(notStarted.length > 0 || liveMatches.length > 0) && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Match Controls</h2>
          {[...notStarted, ...liveMatches].map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.home_team.name} vs {m.away_team.name}
                </p>
                <MatchStatusBadge status={m.status} />
              </div>
              <div className="flex gap-1">
                {m.status === "not_started" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMatchStatus(m.id, "live")}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                {m.status === "live" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMatchStatus(m.id, "paused")}
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMatchStatus(m.id, "finished")}
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {m.status === "paused" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMatchStatus(m.id, "live")}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── Record Event ───────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" /> Record Event
        </h2>

        {/* Only live matches can have events recorded */}
        <Select value={eventMatch} onValueChange={setEventMatch}>
          <SelectTrigger>
            <SelectValue placeholder="Select match" />
          </SelectTrigger>
          <SelectContent>
            {liveMatches.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.home_team.name} vs {m.away_team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={eventType}
            onValueChange={(v) => setEventType(v as EventType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="goal">⚽ Goal</SelectItem>
              <SelectItem value="yellow_card">🟨 Yellow Card</SelectItem>
              <SelectItem value="red_card">🟥 Red Card</SelectItem>
              <SelectItem value="substitution">🔄 Substitution</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Minute"
            type="number"
            value={eventMinute}
            onChange={(e) => setEventMinute(e.target.value)}
          />
        </div>

        <Select value={eventPlayer} onValueChange={setEventPlayer}>
          <SelectTrigger>
            <SelectValue placeholder="Player" />
          </SelectTrigger>
          <SelectContent>
            {matchPlayers.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.team?.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assist selector — only shown for goals */}
        {eventType === "goal" && (
          <Select value={eventAssist} onValueChange={setEventAssist}>
            <SelectTrigger>
              <SelectValue placeholder="Assist (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {matchPlayers.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={recordEvent} className="w-full">
          Record Event
        </Button>
      </Card>
    </div>
  );
}