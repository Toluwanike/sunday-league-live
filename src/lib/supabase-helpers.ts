// Imports the pre-configured Supabase client from the auto-generated integration folder
import { supabase } from "@/integrations/supabase/client";
// Imports the auto-generated TypeScript types that mirror your Supabase database schema
import type { Database } from "@/integrations/supabase/types";

// ─── Row Types ───────────────────────────────────────────────────────────────
// These map directly to each table's row shape in your Supabase database
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchEvent = Database["public"]["Tables"]["match_events"]["Row"];
export type MatchLineup = Database["public"]["Tables"]["match_lineups"]["Row"];

// ─── Enum Types ───────────────────────────────────────────────────────────────
// These map to PostgreSQL enums defined in your Supabase database
// match_status: e.g. "not_started" | "live" | "paused" | "finished"
export type MatchStatus = Database["public"]["Enums"]["match_status"];
// event_type: e.g. "goal" | "yellow_card" | "red_card" | "assist"
export type EventType = Database["public"]["Enums"]["event_type"];

// ─── Composite Types ──────────────────────────────────────────────────────────
// Match row extended with both team objects (home and away) joined in
export type MatchWithTeams = Match & {
  home_team: Team;
  away_team: Team;
};

// Match event row extended with the scorer and optional assist player joined in
export type MatchEventWithPlayer = MatchEvent & {
  player: Player;
  assist_player: Player | null; // null if no assist was recorded
};

// Player row extended with their team object joined in
export type PlayerWithTeam = Player & {
  team: Team;
};

// ─── Fetch Helpers ────────────────────────────────────────────────────────────

// Fetches all teams, sorted alphabetically by name
export async function fetchTeams() {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw error;
  return data;
}

// Fetches all players with their team info joined
// Optionally filter by teamId to get only players from a specific team
export async function fetchPlayers(teamId?: string) {
  let query = supabase.from("players").select("*, team:teams(*)");
  if (teamId) query = query.eq("team_id", teamId);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data;
}

// Fetches all matches with both home and away team info joined
// Uses named foreign key hints to distinguish between the two team relations
// Optionally filter by match status (e.g. only fetch "live" matches)
export async function fetchMatches(status?: MatchStatus) {
  let query = supabase
    .from("matches")
    .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)");
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("match_date", { ascending: false });
  if (error) throw error;
  return data as MatchWithTeams[];
}

// Fetches a single match by its ID with both team objects joined
// Throws if the match is not found (.single() errors on no result)
export async function fetchMatch(id: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as MatchWithTeams;
}

// Fetches all events for a given match, ordered by match minute (earliest first)
// Joins the scoring player and the optional assist player for each event
export async function fetchMatchEvents(matchId: string) {
  const { data, error } = await supabase
    .from("match_events")
    .select("*, player:players!match_events_player_id_fkey(*), assist_player:players!match_events_assist_player_id_fkey(*)")
    .eq("match_id", matchId)
    .order("minute", { ascending: true });
  if (error) throw error;
  return data as MatchEventWithPlayer[];
}

// Fetches the starting lineup for a given match
// Joins each lineup entry with the player and their team info
export async function fetchMatchLineups(matchId: string) {
  const { data, error } = await supabase
    .from("match_lineups")
    .select("*, player:players!match_lineups_player_id_fkey(*), team:teams!match_lineups_team_id_fkey(*)")
    .eq("match_id", matchId);
  if (error) throw error;
  return data;
}