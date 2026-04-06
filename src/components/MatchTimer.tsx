// MatchTimer.tsx
// Live ticking clock shown on match cards and match detail page
// Counts up from 0, shows stoppage time e.g. "10+2'"
// Only ticks when match is live — freezes at HT during halftime
// MatchTimer.tsx
// Live ticking clock shown on match cards and match detail page
// Counts up from 0, shows stoppage time e.g. "10+2'"
// Only ticks when match is live — freezes at HT during halftime

import { useEffect, useState } from "react";
import type { MatchWithTeams } from "@/lib/supabase-helpers";

type Props = { match: MatchWithTeams };

export default function MatchTimer({ match }: Props) {
  const [displayTime, setDisplayTime] = useState("0'");

  useEffect(() => {
    if (match.status !== "live" && match.status !== "paused") return;

    const tick = () => {
      // Use timer_elapsed_seconds — this is the correct column name in the database
      const elapsed = match.timer_elapsed_seconds ?? 0;
      const stoppage = match.stoppage_time ?? 0;

      let totalSeconds = elapsed;

      // If the timer is currently running (not paused), add the seconds
      // that have passed since the timer was last started
      if (match.timer_started_at && !match.timer_paused_at) {
        const secondsSinceStart =
          (Date.now() - new Date(match.timer_started_at).getTime()) / 1000;
        totalSeconds += secondsSinceStart;
      }

      const minutes = Math.floor(totalSeconds / 60);

      // Once we hit the match duration (10 mins for 5-a-side),
      // show stoppage time format e.g. "10+2'"
      if (stoppage > 0 && minutes >= 10) {
        setDisplayTime(`10+${stoppage}'`);
      } else {
        // Cap at 10 so it never shows 11' or 12' without stoppage
        setDisplayTime(`${Math.min(minutes, 10)}'`);
      }
    };

    tick(); // run immediately so there's no 1 second delay on mount
    const interval = setInterval(tick, 1000); // then tick every second
    return () => clearInterval(interval); // cleanup on unmount
  }, [match]);

  // Show HT label during halftime — timer is frozen
  if (match.status === "paused") {
    return <span className="text-warning font-mono font-bold text-xs">HT</span>;
  }

  // Don't render anything if match hasn't started or is finished
  if (match.status !== "live") return null;

  return (
    <span className="text-live font-mono font-bold text-xs animate-pulse">
      {displayTime}
    </span>
  );
}