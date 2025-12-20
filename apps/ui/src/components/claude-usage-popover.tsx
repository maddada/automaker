
import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getElectronAPI } from "@/lib/electron";
import { useAppStore } from "@/store/app-store";
import { useNavigate } from "@tanstack/react-router";

// Simple date formatter to replace date-fns format(date, "EEE h:mm a")
const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }).format(date);
    } catch (e) {
        return "";
    }
};

// Types matching the server response
// ClaudeUsage is now exported from @/store/app-store and used via the store hook

interface ClaudeStatus {
    indicator: {
        color: "green" | "yellow" | "orange" | "red" | "gray";
    };
    description: string;
}

export function ClaudeUsagePopover() {
  const { claudeRefreshInterval, claudeUsage, claudeUsageLastUpdated, setClaudeUsage } =
    useAppStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Check if key exists on mount
  useEffect(() => {
    const checkKey = async () => {
      const api = getElectronAPI();
      if (api.claude) {
        const result = await api.claude.checkKey();
        setHasKey(result.exists);

        // Auto-fetch if key exists and data is stale (> 2 mins)
        if (result.exists) {
          const now = Date.now();
          const stale =
            !claudeUsageLastUpdated || now - claudeUsageLastUpdated > 2 * 60 * 1000;
          if (stale) {
            fetchUsage(true); // Fetch in background
          }
        }
      }
    };
    checkKey();
  }, []); // Only on mount

  const fetchUsage = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    setError(null);
    try {
      const api = getElectronAPI();
      if (!api.claude) {
        throw new Error("Claude API not available");
      }
      const data = await api.claude.getUsage();
      if (data.error) {
        // Clear key state for auth/validation errors so button shows "No Key" state
        if (data.error === "Unauthorized") {
          setHasKey(false);
          throw new Error("Session key expired or invalid");
        }
        if (data.error === "Invalid session key format") {
          setHasKey(false);
          throw new Error("Invalid session key format");
        }
        throw new Error(data.error);
      }
      setClaudeUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch usage");
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch when opened - force fetch if no data
    if (open && hasKey) {
      // If we have no data, fetch immediately
      if (!claudeUsage) {
        fetchUsage();
      } else {
        // If we have data, check if it's stale
        const now = Date.now();
        const stale =
          !claudeUsageLastUpdated || now - claudeUsageLastUpdated > 2 * 60 * 1000;
        if (stale) {
          fetchUsage(false);
        }
      }
    }

    // Auto-refresh interval (only when open)
    let intervalId: NodeJS.Timeout | null = null;
    if (open && hasKey && claudeRefreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchUsage(true);
      }, claudeRefreshInterval * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [open, hasKey]); // Removed claudeUsageLastUpdated from deps to avoid loop

  // Derived status color/icon helper
  const getStatusInfo = (percentage: number) => {
    if (percentage >= 80)
      return { color: "text-red-500", icon: XCircle, bg: "bg-red-500" };
    if (percentage >= 50)
      return { color: "text-orange-500", icon: AlertTriangle, bg: "bg-orange-500" };
    return { color: "text-green-500", icon: CheckCircle, bg: "bg-green-500" };
  };

  // Helper component for the progress bar
  const ProgressBar = ({
    percentage,
    colorClass,
  }: {
    percentage: number;
    colorClass: string;
  }) => (
    <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
      <div
        className={cn("h-full transition-all duration-500", colorClass)}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );

  const UsageCard = ({
    title,
    subtitle,
    percentage,
    resetTime,
    isPrimary = false,
  }: {
    title: string;
    subtitle: string;
    percentage: number;
    resetTime?: string;
    isPrimary?: boolean;
  }) => {
    const status = getStatusInfo(percentage);
    const StatusIcon = status.icon;

    return (
      <div
        className={cn(
          "rounded-xl border bg-card/50 p-4",
          isPrimary ? "border-border/60 shadow-sm" : "border-border/40"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className={cn("font-semibold", isPrimary ? "text-sm" : "text-xs")}>
              {title}
            </h4>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn("w-3.5 h-3.5", status.color)} />
            <span
              className={cn(
                "font-mono font-bold",
                status.color,
                isPrimary ? "text-base" : "text-sm"
              )}
            >
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        <ProgressBar percentage={percentage} colorClass={status.bg} />
        {resetTime && (
          <div className="mt-2 flex justify-end">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Resets {formatDate(resetTime)}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Header Button
  const maxPercentage = claudeUsage
    ? Math.max(claudeUsage.sessionPercentage || 0, claudeUsage.weeklyPercentage || 0)
    : 0;

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 gap-3 bg-secondary border border-border px-3"
    >
      <span className="text-sm font-medium">Usage</span>
      {hasKey && (
        <div className="h-1.5 w-16 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              getProgressBarColor(maxPercentage)
            )}
            style={{ width: `${Math.min(maxPercentage, 100)}%` }}
          />
        </div>
      )}
    </Button>
  );

  if (hasKey === false) {
    // If no key, maybe show nothing or a prompt.
    // Requirement says "implement a way ... to add the key ... like Claude Usage Tracker".
    // But button availability wasn't strictly specified for 'no key' state.
    // I'll leave it visible but show message inside.
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border shadow-2xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Claude Usage</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => fetchUsage(false)}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {error ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500/80" />
              <div className="space-y-1 flex flex-col items-center">
                <p className="text-sm font-medium">{error}</p>
                {(error.includes("session key") ||
                  error === "Session key expired or invalid") && (
                  <Button
                    variant="link"
                    className="text-xs text-brand-500 h-auto p-0 hover:no-underline"
                    onClick={() => {
                      setOpen(false);
                      navigate({ to: "/settings" });
                    }}
                  >
                    Configure in Settings →
                  </Button>
                )}
              </div>
            </div>
          ) : !claudeUsage ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Loading usage data...</p>
            </div>
          ) : (
            <>
              {/* Primary Card */}
              <UsageCard
                title="Session Usage"
                subtitle="5-hour rolling window"
                percentage={claudeUsage.sessionPercentage}
                resetTime={claudeUsage.sessionResetTime}
                isPrimary={true}
              />

              {/* Secondary Cards Grid */}
              <div
                className={cn(
                  "grid gap-3",
                  (claudeUsage?.costLimit && claudeUsage.costLimit > 0) ||
                    (claudeUsage?.opusWeeklyTokensUsed &&
                      claudeUsage.opusWeeklyTokensUsed > 0)
                    ? "grid-cols-2"
                    : "grid-cols-1"
                )}
              >
                <UsageCard
                  title="Weekly"
                  subtitle="All models"
                  percentage={claudeUsage.weeklyPercentage}
                  resetTime={claudeUsage.weeklyResetTime}
                />
                {claudeUsage.opusWeeklyTokensUsed > 0 && (
                  <UsageCard
                    title="Opus"
                    subtitle="Weekly"
                    percentage={claudeUsage.opusWeeklyPercentage}
                    // resetTime is same as weekly
                  />
                )}
              </div>

              {/* Extra Usage / Cost */}
              {claudeUsage.costLimit && claudeUsage.costLimit > 0 && (
                <UsageCard
                  title="Extra Usage"
                  subtitle={`${claudeUsage.costUsed ?? 0} / ${claudeUsage.costLimit} ${claudeUsage.costCurrency ?? ""}`}
                  percentage={
                    claudeUsage.costLimit > 0
                      ? ((claudeUsage.costUsed ?? 0) / claudeUsage.costLimit) * 100
                      : 0
                  }
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/10 border-t border-border/50">
          <a
            href="https://status.claude.com"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            Claude Status <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <div className="flex gap-2">{/* Could add quick settings link here */}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
