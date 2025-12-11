import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Terminal,
  Atom,
  Sparkles,
} from "lucide-react";
import type { ClaudeAuthStatus, CodexAuthStatus } from "@/store/setup-store";

interface AuthenticationStatusDisplayProps {
  claudeAuthStatus: ClaudeAuthStatus | null;
  codexAuthStatus: CodexAuthStatus | null;
  apiKeyStatus: {
    hasAnthropicKey: boolean;
    hasOpenAIKey: boolean;
    hasGoogleKey: boolean;
  } | null;
  apiKeys: {
    anthropic: string;
    google: string;
    openai: string;
  };
}

export function AuthenticationStatusDisplay({
  claudeAuthStatus,
  codexAuthStatus,
  apiKeyStatus,
  apiKeys,
}: AuthenticationStatusDisplayProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-brand-500" />
        <Label className="text-foreground font-semibold">
          Current Authentication Configuration
        </Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Claude Authentication Status */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-foreground">
              Claude (Anthropic)
            </span>
          </div>
          <div className="space-y-1.5 text-xs min-h-12">
            {claudeAuthStatus?.authenticated ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">
                    Method:{" "}
                    <span className="font-mono text-foreground">
                      {claudeAuthStatus.method === "oauth"
                        ? "OAuth Token"
                        : claudeAuthStatus.method === "api_key"
                        ? "API Key"
                        : "Unknown"}
                    </span>
                  </span>
                </div>
                {claudeAuthStatus.oauthTokenValid && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>OAuth token configured</span>
                  </div>
                )}
                {claudeAuthStatus.apiKeyValid && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>API key configured</span>
                  </div>
                )}
                {apiKeyStatus?.hasAnthropicKey && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>Environment variable detected</span>
                  </div>
                )}
                {apiKeys.anthropic && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>Manual API key in settings</span>
                  </div>
                )}
              </>
            ) : apiKeyStatus?.hasAnthropicKey ? (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-3 h-3 shrink-0" />
                <span>Using environment variable (ANTHROPIC_API_KEY)</span>
              </div>
            ) : apiKeys.anthropic ? (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-3 h-3 shrink-0" />
                <span>Using manual API key from settings</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground py-0.5">
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                <span className="text-xs">Not Setup</span>
              </div>
            )}
          </div>
        </div>

        {/* Codex/OpenAI Authentication Status */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Atom className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-foreground">
              Codex (OpenAI)
            </span>
          </div>
          <div className="space-y-1.5 text-xs min-h-12">
            {codexAuthStatus?.authenticated ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">
                    Method:{" "}
                    <span className="font-mono text-foreground">
                      {codexAuthStatus.method === "cli_verified" ||
                      codexAuthStatus.method === "cli_tokens"
                        ? "CLI Login (OpenAI Account)"
                        : codexAuthStatus.method === "api_key"
                        ? "API Key (Auth File)"
                        : codexAuthStatus.method === "env"
                        ? "API Key (Environment)"
                        : "Unknown"}
                    </span>
                  </span>
                </div>
                {codexAuthStatus.method === "cli_verified" ||
                codexAuthStatus.method === "cli_tokens" ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Account authenticated</span>
                  </div>
                ) : codexAuthStatus.apiKeyValid ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>API key configured</span>
                  </div>
                ) : null}
                {apiKeyStatus?.hasOpenAIKey && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>Environment variable detected</span>
                  </div>
                )}
                {apiKeys.openai && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>Manual API key in settings</span>
                  </div>
                )}
              </>
            ) : apiKeyStatus?.hasOpenAIKey ? (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-3 h-3 shrink-0" />
                <span>Using environment variable (OPENAI_API_KEY)</span>
              </div>
            ) : apiKeys.openai ? (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-3 h-3 shrink-0" />
                <span>Using manual API key from settings</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground py-0.5">
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                <span className="text-xs">Not Setup</span>
              </div>
            )}
          </div>
        </div>

        {/* Google/Gemini Authentication Status */}
        <div className="p-3 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">
              Gemini (Google)
            </span>
          </div>
          <div className="space-y-1.5 text-xs min-h-12">
            {apiKeyStatus?.hasGoogleKey ? (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-3 h-3 shrink-0" />
                <span>Using environment variable (GOOGLE_API_KEY)</span>
              </div>
            ) : apiKeys.google ? (
              <div className="flex items-center gap-2 text-blue-400">
                <Info className="w-3 h-3 shrink-0" />
                <span>Using manual API key from settings</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground py-0.5">
                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                <span className="text-xs">Not Setup</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
