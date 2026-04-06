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
    if (match.status !== "live" && match.status !== "halftime") return;

    const tick = () => {
      const elapsed = match.elapsed_seconds ?? 0;
      const stoppage = match.stoppage_time ?? 0;

      let totalSeconds = elapsed;

      if (match.timer_started_at && !match.timer_paused_at) {
        const secondsSinceStart =
          (Date.now() - new Date(match.timer_started_at).getTime()) / 1000;
        totalSeconds += secondsSinceStart;
      }

      const minutes = Math.floor(totalSeconds / 60);

      if (stoppage > 0 && minutes >= 10) {
        setDisplayTime(`10+${stoppage}'`);
      } else {
        setDisplayTime(`${Math.min(minutes, 10)}'`);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match]);

  if (match.status === "halftime") {
    return <span className="text-warning font-mono font-bold text-xs">HT</span>;
  }

  if (match.status !== "live") return null;

  return (
    <span className="text-live font-mono font-bold text-xs animate-pulse">
      {displayTime}
    </span>
  );
}