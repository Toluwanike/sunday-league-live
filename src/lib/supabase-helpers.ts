import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchEvent = Database["public"]["Tables"]["match_events"]["Row"];
export type MatchLineup = Database["public"]["Tables"]["match_lineups"]["Row"];
export type MatchStatus = Database["public"]["Enums"]["match_status"];
export type EventType = Database["public"]["Enums"]["event_type"];

export type MatchWithTeams = Match & {
  home_team: Team;
  away_team: Team;
};

export type MatchEventWithPlayer = MatchEvent & {
  player: Player;
  assist_player: Player | null;
};

export type PlayerWithTeam = Player & {
  team: Team;
};

export async function fetchTeams() {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function fetchPlayers(teamId?: string) {
  let query = supabase.from("players").select("*, team:teams(*)");
  if (teamId) query = query.eq("team_id", teamId);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data;
}

export async function fetchMatches(status?: MatchStatus) {
  let query = supabase
    .from("matches")
    .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)");
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("match_date", { ascending: false });
  if (error) throw error;
  return data as MatchWithTeams[];
}

export async function fetchMatch(id: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as MatchWithTeams;
}

export async function fetchMatchEvents(matchId: string) {
  const { data, error } = await supabase
    .from("match_events")
    .select("*, player:players!match_events_player_id_fkey(*), assist_player:players!match_events_assist_player_id_fkey(*)")
    .eq("match_id", matchId)
    .order("minute", { ascending: true });
  if (error) throw error;
  return data as MatchEventWithPlayer[];
}

export async function fetchMatchLineups(matchId: string) {
  const { data, error } = await supabase
    .from("match_lineups")
    .select("*, player:players!match_lineups_player_id_fkey(*), team:teams!match_lineups_team_id_fkey(*)")
    .eq("match_id", matchId);
  if (error) throw error;
  return data;
}

// Calculates the current match time in minutes from timer columns
// Used by both admin and viewer so they always see the same time
export function calculateMatchTime(match: MatchWithTeams): number {
  if (!match.timer_started_at) return 0;
  const elapsed = match.elapsed_seconds ?? 0;
  // If paused, just return stored elapsed time
  if (match.timer_paused_at) return Math.floor(elapsed / 60);
  // If running, add seconds since timer was last started
  const secondsSinceStart = (Date.now() - new Date(match.timer_started_at).getTime()) / 1000;
  return Math.floor((elapsed + secondsSinceStart) / 60);
}