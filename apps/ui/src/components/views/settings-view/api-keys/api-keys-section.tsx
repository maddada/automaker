import { useAppStore } from "@/store/app-store";
import { useSetupStore } from "@/store/setup-store";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle2, Settings, Trash2, Loader2, Save } from "lucide-react";
import { ApiKeyField } from "./api-key-field";
import { buildProviderConfigs } from "@/config/api-providers";
import { AuthenticationStatusDisplay } from "./authentication-status-display";
import { SecurityNotice } from "./security-notice";
import { useApiKeyManagement } from "./hooks/use-api-key-management";
import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import { getElectronAPI } from "@/lib/electron";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApiKeysSection() {
  const { apiKeys, setApiKeys } = useAppStore();
  const { claudeAuthStatus, setClaudeAuthStatus, setSetupComplete } = useSetupStore();
  const [isDeletingAnthropicKey, setIsDeletingAnthropicKey] = useState(false);
  const navigate = useNavigate();

  const { providerConfigParams, apiKeyStatus, handleSave, saved } =
    useApiKeyManagement();

  const providerConfigs = buildProviderConfigs(providerConfigParams);

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

  // Delete Anthropic API key
  const deleteAnthropicKey = useCallback(async () => {
    setIsDeletingAnthropicKey(true);
    try {
      const api = getElectronAPI();
      if (!api.setup?.deleteApiKey) {
        toast.error("Delete API not available");
        return;
      }

      const result = await api.setup.deleteApiKey("anthropic");
      if (result.success) {
        setApiKeys({ ...apiKeys, anthropic: "" });
        setClaudeAuthStatus({
          authenticated: false,
          method: "none",
          hasCredentialsFile: claudeAuthStatus?.hasCredentialsFile || false,
        });
        toast.success("Anthropic API key deleted");
      } else {
        toast.error(result.error || "Failed to delete API key");
      }
    } catch (error) {
      toast.error("Failed to delete API key");
    } finally {
      setIsDeletingAnthropicKey(false);
    }
  }, [apiKeys, setApiKeys, claudeAuthStatus, setClaudeAuthStatus]);

  // Open setup wizard
  const openSetupWizard = useCallback(() => {
    setSetupComplete(false);
    navigate({ to: "/setup" });
  }, [setSetupComplete, navigate]);

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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
            <Key className="w-5 h-5 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">API Keys</h2>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">
          Configure your AI provider API keys. Keys are stored locally in your browser.
        </p>
      </div>
      <div className="p-6 space-y-8">
        {/* Claude Session Key Section */}
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-foreground">Claude Usage Session Key</h3>
                    <p className="text-xs text-muted-foreground">
                        Required for tracking token usage from Claude.ai.
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
                    <Label htmlFor="session-key" className="text-xs">Session Key (sessionKey cookie)</Label>
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
                            className="bg-brand-500 hover:bg-brand-600 text-white min-w-[80px]"
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

        {/* API Key Fields */}
        <div className="space-y-6">
            <h3 className="text-sm font-medium text-foreground">Provider API Keys</h3>
            {providerConfigs.map((provider) => (
            <ApiKeyField key={provider.key} config={provider} />
            ))}
        </div>

        {/* Authentication Status Display */}
        <AuthenticationStatusDisplay
          claudeAuthStatus={claudeAuthStatus}
          apiKeyStatus={apiKeyStatus}
          apiKeys={apiKeys}
        />

        {/* Security Notice */}
        <SecurityNotice />

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            data-testid="save-settings"
            className={cn(
              "min-w-[140px] h-10",
              "bg-gradient-to-r from-brand-500 to-brand-600",
              "hover:from-brand-600 hover:to-brand-600",
              "text-white font-medium border-0",
              "shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/25",
              "transition-all duration-200 ease-out",
              "hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              "Save API Keys"
            )}
          </Button>

          <Button
            onClick={openSetupWizard}
            variant="outline"
            className="h-10 border-border"
            data-testid="run-setup-wizard"
          >
            <Settings className="w-4 h-4 mr-2" />
            Run Setup Wizard
          </Button>

          {apiKeys.anthropic && (
            <Button
              onClick={deleteAnthropicKey}
              disabled={isDeletingAnthropicKey}
              variant="outline"
              className="h-10 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
              data-testid="delete-anthropic-key"
            >
              {isDeletingAnthropicKey ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Anthropic Key
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
