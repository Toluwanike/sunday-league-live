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
import { Plus, Play, Pause, Square, CircleDot, Shield, Users, Pencil, Trash2, Check, X } from "lucide-react";
import type { MatchStatus, EventType } from "@/lib/supabase-helpers";
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
  const { data: matches } = useQuery({ queryKey: ["matches"], queryFn: () => fetchMatches(), refetchInterval: 3000 });
  const { data: players } = useQuery({ queryKey: ["players"], queryFn: () => fetchPlayers() });

  // ── Team management ────────────────────────────────────────────────────────
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    const { error } = await supabase.from("teams").insert({ name: newTeamName.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Team added!"); setNewTeamName(""); queryClient.invalidateQueries({ queryKey: ["teams"] }); }
  };

  const saveTeam = async (id: string) => {
    if (!editingTeamName.trim()) return;
    const { error } = await supabase.from("teams").update({ name: editingTeamName.trim() }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Team updated!"); setEditingTeamId(null); queryClient.invalidateQueries({ queryKey: ["teams"] }); }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm("Delete this team?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Team deleted!"); queryClient.invalidateQueries({ queryKey: ["teams"] }); }
  };

  // ── Player management ──────────────────────────────────────────────────────
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPosition, setNewPlayerPosition] = useState("");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [editingPlayerNumber, setEditingPlayerNumber] = useState("");
  const [editingPlayerPosition, setEditingPlayerPosition] = useState("");

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
      setNewPlayerName(""); setNewPlayerNumber(""); setNewPlayerPosition("");
      queryClient.invalidateQueries({ queryKey: ["players"] });
    }
  };

  const savePlayer = async (id: string) => {
    if (!editingPlayerName.trim()) return;
    const { error } = await supabase.from("players").update({
      name: editingPlayerName.trim(),
      shirt_number: editingPlayerNumber ? parseInt(editingPlayerNumber) : null,
      position: editingPlayerPosition || null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Player updated!"); setEditingPlayerId(null); queryClient.invalidateQueries({ queryKey: ["players"] }); }
  };

  const deletePlayer = async (id: string) => {
    if (!confirm("Delete this player?")) return;
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Player deleted!"); queryClient.invalidateQueries({ queryKey: ["players"] }); }
  };

  // ── Match management ───────────────────────────────────────────────────────
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchType, setMatchType] = useState("league");
  const [matchRound, setMatchRound] = useState("semi_final");
  const [matchLeg, setMatchLeg] = useState("1");

  const createMatch = async () => {
    if (!homeTeam || !awayTeam || homeTeam === awayTeam) {
      toast.error("Select two different teams");
      return;
    }
    const { error } = await supabase.from("matches").insert({
      home_team_id: homeTeam,
      away_team_id: awayTeam,
      match_date: matchDate ? new Date(matchDate).toISOString() : new Date().toISOString(),
      match_type: matchType,
      round: matchType === "cup" ? matchRound : null,
      leg: matchType === "cup" ? parseInt(matchLeg) : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Match created!");
      setHomeTeam(""); setAwayTeam(""); setMatchDate("");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    }
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Delete this match and all its events?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Match deleted!"); queryClient.invalidateQueries({ queryKey: ["matches"] }); }
  };

  const updateMatchStatus = async (matchId: string, status: MatchStatus) => {
    const { error } = await supabase.from("matches").update({ status }).eq("id", matchId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["matches"] });
  };

  // ── Event recording ────────────────────────────────────────────────────────
  const [eventMatch, setEventMatch] = useState("");
  const [eventType, setEventType] = useState<EventType>("goal");
  const [eventPlayer, setEventPlayer] = useState("");
  const [eventAssist, setEventAssist] = useState("none");
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
      assist_player_id: eventAssist === "none" || eventAssist === "" ? null : eventAssist,
      minute: parseInt(eventMinute),
    });
    if (error) { toast.error(error.message); return; }

    if (eventType === "goal" && selectedMatch) {
      const scoringPlayer = players?.find((p: any) => p.id === eventPlayer);
      if (scoringPlayer) {
        const isHome = (scoringPlayer as any).team_id === selectedMatch.home_team_id;
        await supabase.from("matches")
          .update(isHome
            ? { home_score: selectedMatch.home_score + 1 }
            : { away_score: selectedMatch.away_score + 1 })
          .eq("id", eventMatch);
      }
    }

    toast.success("Event recorded!");
    setEventMinute(""); setEventPlayer(""); setEventAssist("none");
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["match-events"] });
  };

  if (!user) return null;

  const liveMatches = matches?.filter((m) => m.status === "live" || m.status === "halftime") ?? [];
  const notStarted = matches?.filter((m) => m.status === "not_started") ?? [];
  const allActiveMatches = [...notStarted, ...liveMatches];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* ── Teams ─────────────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Teams
        </h2>
        <div className="flex gap-2">
          <Input placeholder="New team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTeam()} />
          <Button onClick={addTeam} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-1">
          {teams?.map((t) => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              {editingTeamId === t.id ? (
                <>
                  <Input className="h-7 text-sm" value={editingTeamName} onChange={(e) => setEditingTeamName(e.target.value)} autoFocus />
                  <Button size="sm" variant="outline" onClick={() => saveTeam(t.id)}><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingTeamId(null)}><X className="h-3 w-3" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{t.name}</span>
                  <Button size="sm" variant="outline" onClick={() => { setEditingTeamId(t.id); setEditingTeamName(t.name); }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => deleteTeam(t.id)}><Trash2 className="h-3 w-3" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Players ───────────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Players
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Player name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
          <Select value={newPlayerTeam} onValueChange={setNewPlayerTeam}>
            <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              {teams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Shirt number" type="number" value={newPlayerNumber} onChange={(e) => setNewPlayerNumber(e.target.value)} />
          <Input placeholder="Position" value={newPlayerPosition} onChange={(e) => setNewPlayerPosition(e.target.value)} />
        </div>
        <Button onClick={addPlayer} size="sm" className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Player</Button>
        <div className="space-y-1">
          {players?.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              {editingPlayerId === p.id ? (
                <>
                  <Input className="h-7 text-sm" value={editingPlayerName} onChange={(e) => setEditingPlayerName(e.target.value)} autoFocus />
                  <Input className="h-7 text-sm w-16" placeholder="#" value={editingPlayerNumber} onChange={(e) => setEditingPlayerNumber(e.target.value)} />
                  <Input className="h-7 text-sm w-20" placeholder="Pos" value={editingPlayerPosition} onChange={(e) => setEditingPlayerPosition(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => savePlayer(p.id)}><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingPlayerId(null)}><X className="h-3 w-3" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.position ?? ""} {p.shirt_number ? `#${p.shirt_number}` : ""}</span>
                  <Button size="sm" variant="outline" onClick={() => { setEditingPlayerId(p.id); setEditingPlayerName(p.name); setEditingPlayerNumber(p.shirt_number?.toString() ?? ""); setEditingPlayerPosition(p.position ?? ""); }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => deletePlayer(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Create Match ──────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Matches</h2>
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
          <Input type="datetime-local" className="col-span-2" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
          <Select value={matchType} onValueChange={setMatchType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="league">League</SelectItem>
              <SelectItem value="cup">Cup</SelectItem>
            </SelectContent>
          </Select>
          {matchType === "cup" && (
            <>
              <Select value={matchRound} onValueChange={setMatchRound}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semi_final">Semi Final</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
              <Select value={matchLeg} onValueChange={setMatchLeg}>
                <SelectTrigger><SelectValue placeholder="Leg" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Leg 1</SelectItem>
                  <SelectItem value="2">Leg 2</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <Button onClick={createMatch} className="w-full">Create Match</Button>
        <div className="space-y-1">
          {matches?.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <span className="flex-1 text-sm font-medium truncate">
                {m.home_team.name} vs {m.away_team.name}
                {m.match_type === "cup" && (
                  <span className="ml-1 text-xs text-primary">
                    [{m.round === "final" ? "Cup Final" : `SF L${m.leg}`}]
                  </span>
                )}
              </span>
              <MatchStatusBadge status={m.status} />
              <Button size="sm" variant="outline" onClick={() => deleteMatch(m.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Match Controls + Timer ─────────────────────────────────────────── */}
      {allActiveMatches.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Match Controls</h2>
          {allActiveMatches.map((m) => (
            <div key={m.id} className="space-y-2 p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.home_team.name} vs {m.away_team.name}</p>
                  <MatchStatusBadge status={m.status} />
                </div>
                <div className="flex gap-1">
                  {m.status === "not_started" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from("matches").update({
                        status: "live",
                        timer_started_at: new Date().toISOString(),
                        elapsed_seconds: 0,
                      }).eq("id", m.id);
                      queryClient.invalidateQueries({ queryKey: ["matches"] });
                    }}><Play className="h-3 w-3" /></Button>
                  )}
                  {m.status === "live" && (
                    <>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const elapsed = m.elapsed_seconds ?? 0;
                        const secondsSinceStart = m.timer_started_at
                          ? (Date.now() - new Date(m.timer_started_at).getTime()) / 1000 : 0;
                        await supabase.from("matches").update({
                          status: "halftime",
                          timer_paused_at: new Date().toISOString(),
                          elapsed_seconds: Math.floor(elapsed + secondsSinceStart),
                        }).eq("id", m.id);
                        queryClient.invalidateQueries({ queryKey: ["matches"] });
                      }}><Pause className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateMatchStatus(m.id, "finished")}>
                        <Square className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {m.status === "halftime" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      await supabase.from("matches").update({
                        status: "live",
                        timer_started_at: new Date().toISOString(),
                        timer_paused_at: null,
                      }).eq("id", m.id);
                      queryClient.invalidateQueries({ queryKey: ["matches"] });
                    }}><Play className="h-3 w-3" /></Button>
                  )}
                </div>
              </div>

              {/* Stoppage time — only shown during live matches */}
              {m.status === "live" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Stoppage:</span>
                  {[1, 2, 3, 4, 5].map((mins) => (
                    <Button
                      key={mins}
                      size="sm"
                      variant={m.stoppage_time === mins ? "default" : "outline"}
                      className="h-6 w-8 text-xs p-0"
                      onClick={async () => {
                        await supabase.from("matches").update({ stoppage_time: mins }).eq("id", m.id);
                        queryClient.invalidateQueries({ queryKey: ["matches"] });
                      }}
                    >
                      +{mins}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* ── Record Event ──────────────────────────────────────────────────── */}
      <Card className="p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-primary" /> Record Event
        </h2>
        <Select value={eventMatch} onValueChange={setEventMatch}>
          <SelectTrigger><SelectValue placeholder="Select match" /></SelectTrigger>
          <SelectContent>
            {liveMatches.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.home_team.name} vs {m.away_team.name}</SelectItem>
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
              <SelectItem value="none">None</SelectItem>
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