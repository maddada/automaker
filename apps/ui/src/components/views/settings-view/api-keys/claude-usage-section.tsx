import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/store/app-store";

export function ClaudeUsageSection() {
  const { claudeRefreshInterval, setClaudeRefreshInterval } = useAppStore();
  const [localInterval, setLocalInterval] = useState(claudeRefreshInterval);

  // Sync local state with store when store changes (e.g. initial load)
  useEffect(() => {
    setLocalInterval(claudeRefreshInterval);
  }, [claudeRefreshInterval]);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        "border border-border/50",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl",
        "shadow-sm shadow-black/5"
      )}
    >
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-transparent via-accent/5 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center border border-green-500/20">
            <div className="w-5 h-5 rounded-full bg-green-500/50" />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Claude Usage Tracking</h2>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">
          Track your Claude Code usage limits. Uses the Claude CLI for data.
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Info about CLI requirement */}
        <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2 border border-border/50">
          <p>Usage tracking requires Claude Code CLI to be installed and authenticated:</p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Install Claude Code CLI if not already installed</li>
            <li>Run <code className="font-mono bg-muted px-1 rounded">claude login</code> to authenticate</li>
            <li>Usage data will be fetched automatically</li>
          </ol>
        </div>

        {/* Refresh Interval Section */}
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Refresh Interval
                </h3>
                <p className="text-xs text-muted-foreground">
                    How often to check for usage updates.
                </p>
            </div>

            <div className="flex items-center gap-4">
                <Slider
                    value={[Math.max(30, Math.min(120, localInterval || 30))]}
                    onValueChange={(vals) => setLocalInterval(vals[0])}
                    onValueCommit={(vals) => setClaudeRefreshInterval(vals[0])}
                    min={30}
                    max={120}
                    step={5}
                    className="flex-1"
                />
                <span className="w-12 text-sm font-mono text-right">{Math.max(30, Math.min(120, localInterval || 30))}s</span>
            </div>
        </div>
      </div>
    </div>
  );
}
