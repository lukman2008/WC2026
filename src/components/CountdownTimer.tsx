import { useState, useEffect, useMemo } from "react";

interface Props {
  targetDate: Date;
  compact?: boolean;
}

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export function CountdownTimer({ targetDate, compact }: Props) {
  // Use useMemo to ensure targetDate is consistently parsed
  const target = useMemo(() => new Date(targetDate), [targetDate]);
  
  // Initialize with null to avoid hydration mismatch
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    // Set initial time after mount
    setTime(getTimeLeft(target));
    const id = setInterval(() => setTime(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  // Render placeholder during SSR/hydration
  if (!time) {
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-primary">--d</span>
          <span className="font-mono font-semibold text-primary">--h</span>
          <span className="font-mono font-semibold text-primary">--m</span>
          <span className="opacity-60">until kickoff</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        {["Days", "Hours", "Minutes", "Seconds"].map(label => (
          <div key={label} className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-card border border-border shadow-card">
              <span className="text-xl font-bold font-mono text-primary">--</span>
            </div>
            <span className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="font-mono font-semibold text-primary">{time.days}d</span>
        <span className="font-mono font-semibold text-primary">{time.hours}h</span>
        <span className="font-mono font-semibold text-primary">{time.minutes}m</span>
        <span className="opacity-60">until kickoff</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {units.map(u => (
        <div key={u.label} className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-card border border-border shadow-card">
            <span className="text-xl font-bold font-mono text-primary">{String(u.value).padStart(2, "0")}</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
