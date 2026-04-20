// HistoryPage.tsx
// Shows all completed past competitions as cards
// Each card shows the competition name, format, league winner and cup winner
// Clicking a card takes you to the full detail view for that edition

import { useQuery } from "@tanstack/react-query";
import { fetchAllCompetitions } from "@/lib/supabase-helpers";
import { Card } from "@/components/ui/card";
import { Trophy, Shield, Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function HistoryPage() {
  // Fetch all competitions — both active and completed
  // So the current one shows at the top marked as Active
  const { data: competitions, isLoading } = useQuery({
    queryKey: ["all-competitions"],
    queryFn: fetchAllCompetitions,
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Competition History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every edition of the Talksport Sunday League
        </p>
      </div>

      {/* Competition cards — most recent first */}
      <div className="space-y-3">
        {competitions?.map((c) => (
          <Link key={c.id} to={`/history/${c.id}`}>
            <Card className={`p-5 hover:border-primary/40 transition-colors cursor-pointer ${
              c.status === "active" ? "border-primary/30 bg-primary/5" : ""
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">

                  {/* Competition name + status badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-lg truncate">{c.name}</h2>
                    {/* Active badge — only shown for the current competition */}
                    {c.status === "active" && (
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                    {c.status === "completed" && (
                      <span className="text-xs font-semibold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Format pill e.g. 5-a-side */}
                  <p className="text-xs text-muted-foreground mb-3">
                    {c.format}
                  </p>

                  {/* Winners row — only shown once competition is completed */}
                  {c.status === "completed" && (
                    <div className="flex flex-wrap gap-4">
                      {/* League winner */}
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          League:
                        </span>
                        <span className="text-xs font-semibold">
                          {c.league_winner?.name ?? "TBD"}
                        </span>
                      </div>
                      {/* Cup winner */}
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          Cup:
                        </span>
                        <span className="text-xs font-semibold">
                          {c.cup_winner?.name ?? "TBD"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Active competition hint */}
                  {c.status === "active" && (
                    <p className="text-xs text-primary">
                      Currently in progress — tap to view
                    </p>
                  )}
                </div>

                {/* Arrow indicator */}
                <div className="text-muted-foreground text-lg shrink-0">→</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {!competitions?.length && (
        <Card className="p-10 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-semibold text-muted-foreground">
            No competitions yet
          </p>
        </Card>
      )}
    </div>
  );
}