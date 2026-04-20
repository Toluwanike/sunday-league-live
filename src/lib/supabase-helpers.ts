// Imports the pre-configured Supabase client
import { supabase } from "@/integrations/supabase/client";
// Imports the TypeScript types that mirror the Supabase database schema
import type { Database } from "@/integrations/supabase/types";

// ─── Row Types ────────────────────────────────────────────────────────────────
// These map directly to each table's row shape in the database
export type Competition = Database["public"]["Tables"]["competitions"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchEvent = Database["public"]["Tables"]["match_events"]["Row"];
export type MatchLineup = Database["public"]["Tables"]["match_lineups"]["Row"];

// ─── Enum Types ───────────────────────────────────────────────────────────────
export type MatchStatus = Database["public"]["Enums"]["match_status"];
export type EventType = Database["public"]["Enums"]["event_type"];

// ─── Composite Types ──────────────────────────────────────────────────────────

// Competition with both winner team objects joined in
export type CompetitionWithWinners = Competition & {
  league_winner: Team | null; // null if league phase not completed yet
  cup_winner: Team | null;    // null if cup not completed yet
};

// Match row with both team objects joined
export type MatchWithTeams = Match & {
  home_team: Team;
  away_team: Team;
};

// Match event with scorer and optional assist player joined
export type MatchEventWithPlayer = MatchEvent & {
  player: Player;
  assist_player: Player | null; // null if no assist was recorded
};

// Player with their team joined
export type PlayerWithTeam = Player & {
  team: Team;
};

// ─── Competition Helpers ──────────────────────────────────────────────────────

// Fetches the single active competition
// This is what the dashboard, standings, matches and cup pages use by default
// There should only ever be one active competition at a time
export async function fetchActiveCompetition(): Promise<CompetitionWithWinners | null> {
  const { data, error } = await supabase
    .from("competitions")
    .select(`
      *,
      league_winner:teams!competitions_league_winner_id_fkey(*),
      cup_winner:teams!competitions_cup_winner_id_fkey(*)
    `)
    .eq("status", "active")
    .maybeSingle(); // maybeSingle returns null instead of throwing if no row found
  if (error) throw error;
  return data as CompetitionWithWinners | null;
}

// Fetches all competitions ordered by most recent first
// Used by the History page to list all past and active editions
export async function fetchAllCompetitions(): Promise<CompetitionWithWinners[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select(`
      *,
      league_winner:teams!competitions_league_winner_id_fkey(*),
      cup_winner:teams!competitions_cup_winner_id_fkey(*)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as CompetitionWithWinners[];
}

// Fetches all completed competitions only
// Used by the History page to show past editions
export async function fetchCompletedCompetitions(): Promise<CompetitionWithWinners[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select(`
      *,
      league_winner:teams!competitions_league_winner_id_fkey(*),
      cup_winner:teams!competitions_cup_winner_id_fkey(*)
    `)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as CompetitionWithWinners[];
}

// Fetches a single competition by ID with winners joined
// Used by the History detail page when viewing a specific past edition
export async function fetchCompetition(id: string): Promise<CompetitionWithWinners | null> {
  const { data, error } = await supabase
    .from("competitions")
    .select(`
      *,
      league_winner:teams!competitions_league_winner_id_fkey(*),
      cup_winner:teams!competitions_cup_winner_id_fkey(*)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as CompetitionWithWinners;
}

// ─── Team Helpers ─────────────────────────────────────────────────────────────

// Fetches all teams for a specific competition
// Pass competitionId to scope to one edition
// Without it, returns all teams across all editions (admin use only)
export async function fetchTeams(competitionId?: string) {
  let query = supabase.from("teams").select("*").order("name");
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── Player Helpers ───────────────────────────────────────────────────────────

// Fetches players with their team info joined
// Can filter by teamId or competitionId
// Used by stats page and admin panel
export async function fetchPlayers(teamId?: string, competitionId?: string) {
  let query = supabase.from("players").select("*, team:teams(*)");
  if (teamId) query = query.eq("team_id", teamId);
  if (competitionId) query = query.eq("competition_id", competitionId);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data;
}

// ─── Match Helpers ────────────────────────────────────────────────────────────

// Fetches all matches with both team objects joined
// Always filter by competitionId so league and cup data
// from different editions never bleed into each other
// Optionally also filter by match status
export async function fetchMatches(competitionId?: string, status?: MatchStatus) {
  let query = supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `);
  // Filter by competition so only this edition's matches are returned
  if (competitionId) query = query.eq("competition_id", competitionId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("match_date", { ascending: true });
  if (error) throw error;
  return data as MatchWithTeams[];
}

// Fetches a single match by ID with both teams joined
// Used by the match detail page
export async function fetchMatch(id: string) {
  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(*),
      away_team:teams!matches_away_team_id_fkey(*)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as MatchWithTeams;
}

// ─── Match Event Helpers ──────────────────────────────────────────────────────

// Fetches all events for a specific match ordered by minute
// Joins the scorer and optional assist player for each event
// Used by the match detail page timeline
export async function fetchMatchEvents(matchId: string) {
  const { data, error } = await supabase
    .from("match_events")
    .select(`
      *,
      player:players!match_events_player_id_fkey(*),
      assist_player:players!match_events_assist_player_id_fkey(*)
    `)
    .eq("match_id", matchId)
    .order("minute", { ascending: true });
  if (error) throw error;
  return data as MatchEventWithPlayer[];
}

// Fetches ALL events across all matches for a competition
// Used by the dashboard stats (top scorer, total goals)
// and the stats page player table
export async function fetchAllMatchEvents(competitionId?: string) {
  // First get all match IDs for this competition
  // then fetch events for those matches
  // This is necessary because match_events doesn't have competition_id directly
  let matchQuery = supabase.from("matches").select("id");
  if (competitionId) matchQuery = matchQuery.eq("competition_id", competitionId);
  const { data: matchIds, error: matchError } = await matchQuery;
  if (matchError) throw matchError;

  const ids = matchIds?.map((m) => m.id) ?? [];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("match_events")
    .select(`
      *,
      player:players!match_events_player_id_fkey(*),
      assist_player:players!match_events_assist_player_id_fkey(*)
    `)
    .in("match_id", ids) // only events from this competition's matches
    .order("minute", { ascending: true });
  if (error) throw error;
  return data as MatchEventWithPlayer[];
}

// ─── Lineup Helpers ───────────────────────────────────────────────────────────

// Fetches the lineup for a specific match
// Joins each entry with player and team info
// Used by the match detail page lineups section
export async function fetchMatchLineups(matchId: string) {
  const { data, error } = await supabase
    .from("match_lineups")
    .select(`
      *,
      player:players!match_lineups_player_id_fkey(*),
      team:teams!match_lineups_team_id_fkey(*)
    `)
    .eq("match_id", matchId);
  if (error) throw error;
  return data;
}