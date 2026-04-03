import { useQuery } from "@tanstack/react-query";
import { fetchMatches } from "@/lib/supabase-helpers";
import MatchCard from "@/components/MatchCard";
import { Calendar } from "lucide-react";

export default function MatchesPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => fetchMatches(),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6 text-primary" />
        All Matches
      </h1>
      <div className="grid gap-3">
        {matches?.map((m) => <MatchCard key={m.id} match={m} />) }
      </div>
      {!matches?.length && (
        <p className="text-center text-muted-foreground py-12">No matches scheduled yet.</p>
      )}
    </div>
  );
}
