import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, fetchPlayers, fetchMatches } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Play, Pause, Square, CircleDot, Trash2, Shield, Users } from "lucide-react";
import type { MatchWithTeams, MatchStatus, EventType } from "@/lib/supabase-helpers";
import MatchStatusBadge from "@/components/MatchStatusBadge";

export default function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/login");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
  const { data: matches } = useQuery({ queryKey: ["matches"], queryFn: () => fetchMatches() });
  const { data: players } = useQuery({ queryKey: ["players"], queryFn: () => fetchPlayers() });

  // Team management
  const [newTeamName, setNewTeamName] = useState("");
  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from("teams").insert({ name: newTeamName.trim() });
    if (error) toast.error(error.message);
    else {
      toast.success("Team added!");
      setNewTeamName("");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    }
  };

  // Player management
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("");
  const addPlayer = async () => {
    if (!newPlayerName.trim() || !newPlayerTeam) return;
    const { error } = await supabase.from("players").insert({
      name: newPlayerName.trim(),
      team_id: newPlayerTeam,
      shirt_number: newPlayerNumber ? parseInt(newPlayerNumber) : null,
      position: newPlayerPosition || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Player added!");
      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerPosition("");
      queryClient.invalidateQueries({ queryKey: ["players"] });
    }
  };

  // Match management
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const createMatch = async () => {
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      toast.error("Select two different teams");
      return;
    }
    const { error } = await supabase.from("matches").insert({
      home_team_id: homeTeam,
      away_team_id: awayTeam,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Match created!");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    }
  };

  const updateMatchStatus = async (matchId: string, status: MatchStatus) => {
    const { error } = await supabase.from("matches").update({ status }).eq("id", matchId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  // Event recording
  const [eventMatch, setEventMatch] = useState("");
  const [eventType, setEventType] = useState<EventType>("goal");
  const [eventPlayer, setEventPlayer] = useState("");
  const [eventAssist, setEventAssist] = useState("");
  const [eventMinute, setEventMinute] = useState("");

  const selectedMatch = matches?.find((m) => m.id === eventMatch);
  const matchPlayers = players?.filter(
    (p: any) => selectedMatch && (p.team_id === selectedMatch.home_team_id || p.team_id === selectedMatch.away_team_id)
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

    // Update score if goal
    if (eventType === "goal" && selectedMatch) {
      const scoringPlayer = players?.find((p: any) => p.id === eventPlayer);
      if (scoringPlayer) {
        const isHome = (scoringPlayer as any).team_id === selectedMatch.home_team_id;
        await supabase
          .from("matches")
          .update(isHome ? { home_score: selectedMatch.home_score + 1 } : { away_score: selectedMatch.away_score + 1 })
          .eq("id", eventMatch);
      }
    }

    toast.success("Event recorded!");
    setEventMinute("");
    setEventPlayer("");
    setEventAssist("");
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["match-events"] });
  };

  if (!user) return null;

  const liveMatches = matches?.filter((m) => m.status === "live" || m.status === "halftime") ?? [];
  const notStarted = matches?.filter((m) => m.status === "not_started") ?? [];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gradient-pitch">Admin Panel</h1>

      {/* Add Team */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Add Team
        </h2>
        <div className="flex gap-2">
          <Input placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
          <Button onClick={addTeam} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
      </Card>

      {/* Add Player */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Add Player
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Player name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
          <Select value={newPlayerTeam} onValueChange={setNewPlayerTeam}>
            <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              {teams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Number" type="number" value={newPlayerNumber} onChange={(e) => setNewPlayerNumber(e.target.value)} />
          <Input placeholder="Position" value={newPlayerPosition} onChange={(e) => setNewPlayerPosition(e.target.value)} />
        </div>
        <Button onClick={addPlayer} size="sm" className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Player</Button>
      </Card>

      {/* Create Match */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Create Match</h2>
        <div className="grid grid-cols-2 gap-2">
          <Select value={homeTeam} onValueChange={setHomeTeam}>
            <SelectTrigger><SelectValue placeholder="Home team" /></SelectTrigger>
            <SelectContent>
              {teams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={awayTeam} onValueChange={setAwayTeam}>
            <SelectTrigger><SelectValue placeholder="Away team" /></SelectTrigger>
            <SelectContent>
              {teams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={createMatch} className="w-full">Create Match</Button>
      </Card>

      {/* Match Controls */}
      {(notStarted.length > 0 || liveMatches.length > 0) && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Match Controls</h2>
          {[...notStarted, ...liveMatches].map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.home_team.name} vs {m.away_team.name}
                </p>
                <MatchStatusBadge status={m.status} />
              </div>
              <div className="flex gap-1">
                {m.status === "not_started" && (
                  <Button size="sm" variant="outline" onClick={() => updateMatchStatus(m.id, "live")}>
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                {m.status === "live" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => updateMatchStatus(m.id, "halftime")}>
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateMatchStatus(m.id, "finished")}>
                      <Square className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {m.status === "halftime" && (
                  <Button size="sm" variant="outline" onClick={() => updateMatchStatus(m.id, "live")}>
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Record Event */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" /> Record Event
        </h2>
        <Select value={eventMatch} onValueChange={setEventMatch}>
          <SelectTrigger><SelectValue placeholder="Select match" /></SelectTrigger>
          <SelectContent>
            {liveMatches.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.home_team.name} vs {m.away_team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="goal">⚽ Goal</SelectItem>
              <SelectItem value="yellow_card">🟨 Yellow Card</SelectItem>
              <SelectItem value="red_card">🟥 Red Card</SelectItem>
              <SelectItem value="substitution">🔄 Substitution</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Minute" type="number" value={eventMinute} onChange={(e) => setEventMinute(e.target.value)} />
        </div>
        <Select value={eventPlayer} onValueChange={setEventPlayer}>
          <SelectTrigger><SelectValue placeholder="Player" /></SelectTrigger>
          <SelectContent>
            {matchPlayers.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} ({p.team?.name})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {eventType === "goal" && (
          <Select value={eventAssist} onValueChange={setEventAssist}>
            <SelectTrigger><SelectValue placeholder="Assist (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {matchPlayers.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={recordEvent} className="w-full">Record Event</Button>
      </Card>
    </div>
  );
}
