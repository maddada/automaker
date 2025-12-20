import { Button } from "@/components/ui/button";
import { Key, CheckCircle2, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getElectronAPI } from "@/lib/electron";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useAppStore } from "@/store/app-store";

export function ClaudeUsageSection() {
  const { claudeRefreshInterval, setClaudeRefreshInterval } = useAppStore();
  
  // Session Key State
  const [sessionKey, setSessionKey] = useState("");
  const [hasSessionKey, setHasSessionKey] = useState(false);
  const [isSavingSessionKey, setIsSavingSessionKey] = useState(false);

  // Check if session key exists on mount
  useEffect(() => {
    const checkKey = async () => {
        const api = getElectronAPI();
        if (api.claude) {
            const result = await api.claude.checkKey();
            setHasSessionKey(result.exists);
        }
    };
    checkKey();
  }, []);

  const handleSaveSessionKey = async () => {
    if (!sessionKey.trim()) return;
    setIsSavingSessionKey(true);
    try {
        const api = getElectronAPI();
        if (api.claude) {
            const result = await api.claude.saveSessionKey(sessionKey);
            if (result.success) {
                toast.success("Session key saved successfully");
                setHasSessionKey(true);
                setSessionKey("");
            } else {
                toast.error(result.error || "Failed to save session key");
            }
        }
    } catch (error) {
        toast.error("Failed to save session key");
    } finally {
        setIsSavingSessionKey(false);
    }
  };

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
          Track your token usage and remaining budget directly from Claude.ai.
        </p>
      </div>
      <div className="p-6 space-y-8">
        {/* Claude Session Key Section */}
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground">Session Key</h3>
                    <p className="text-xs text-muted-foreground">
                        Requires your 'sessionKey' cookie from claude.ai.
                    </p>
                </div>
                {hasSessionKey && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">Configured</span>
                    </div>
                )}
             </div>

             <div className="space-y-3">
                 <div className="space-y-2">
                    <Label htmlFor="session-key" className="text-xs">Session Key</Label>
                    <div className="flex gap-2">
                        <Input 
                            id="session-key" 
                            type="password"
                            value={sessionKey}
                            onChange={(e) => setSessionKey(e.target.value)}
                            placeholder="sk-ant-sid-..." 
                            className="bg-input/50"
                        />
                        <Button 
                            onClick={handleSaveSessionKey}
                            disabled={!sessionKey || isSavingSessionKey}
                            className="bg-green-600 hover:bg-green-700 text-white min-w-[80px]"
                        >
                            {isSavingSessionKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                        </Button>
                    </div>
                 </div>
                 
                 <div className="rounded-lg bg-secondary/30 p-3 text-xs text-muted-foreground space-y-2 border border-border/50">
                    <p className="font-medium text-foreground">How to get your session key:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                        <li>Visit <a href="https://claude.ai" target="_blank" className="text-brand-500 hover:underline">claude.ai</a> and log in</li>
                        <li>Open Developer Tools (F12 or Cmd+Opt+I)</li>
                        <li>Go to the <span className="font-mono bg-muted px-1 rounded">Application</span> tab</li>
                        <li>Expand <span className="font-mono bg-muted px-1 rounded">Cookies</span> and select <span className="font-mono bg-muted px-1 rounded">https://claude.ai</span></li>
                        <li>Find the cookie named <span className="font-mono bg-muted px-1 rounded">sessionKey</span> and copy its value</li>
                    </ol>
                 </div>
             </div>
        </div>
        
        <div className="h-px bg-border/50" />
        
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
                    value={[claudeRefreshInterval]}
                    onValueChange={(vals) => setClaudeRefreshInterval(vals[0])}
                    min={30}
                    max={120}
                    step={5}
                    className="flex-1"
                />
                <span className="w-12 text-sm font-mono text-right">{claudeRefreshInterval}s</span>
            </div>
        </div>
      </div>
    </div>
  );
}
