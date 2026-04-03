import { Badge } from "@/components/ui/badge";
import type { MatchStatus } from "@/lib/supabase-helpers";

export default function MatchStatusBadge({ status }: { status: MatchStatus }) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-live/20 text-live border-live/30 gap-1.5">
          <span className="h-2 w-2 rounded-full bg-live animate-live-pulse" />
          LIVE
        </Badge>
      );
    case "halftime":
      return <Badge className="bg-warning/20 text-warning border-warning/30">HT</Badge>;
    case "finished":
      return <Badge variant="secondary">FT</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">Upcoming</Badge>;
  }
}
