import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  ClaudeUsage,
  AccountInfo,
  OverageSpendLimitResponse,
} from "../routes/claude/types";

const CLAUDE_API_BASE_URL = "https://claude.ai/api";
const WEEKLY_LIMIT = 1000000; // Default reference limit

export class ClaudeUsageService {
  private sessionKeyPath: string;

  constructor() {
    this.sessionKeyPath = path.join(os.homedir(), ".claude-session-key");
  }

  async getSessionKey(): Promise<string> {
    try {
      const key = await fs.readFile(this.sessionKeyPath, "utf-8");
      let trimmedKey = key.trim();
      
      // Handle cases where user copied "sessionKey=sk-ant..."
      if (trimmedKey.startsWith("sessionKey=")) {
        trimmedKey = trimmedKey.replace("sessionKey=", "");
      }
      // Handle potentially quoted strings
      trimmedKey = trimmedKey.replace(/^"|"$/g, "");

      if (!trimmedKey || !trimmedKey.startsWith("sk-ant-")) {
        console.warn(`[ClaudeUsageService] Invalid key format. Key starts with: ${trimmedKey.substring(0, 10)}...`);
        throw new Error("Invalid session key format");
      }
      return trimmedKey;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
             throw new Error("No session key found");
        }
      throw error;
    }
  }

  async saveSessionKey(key: string): Promise<void> {
    let trimmedKey = key.trim();
    // Clean key before saving
    if (trimmedKey.startsWith("sessionKey=")) {
        trimmedKey = trimmedKey.replace("sessionKey=", "");
    }
    trimmedKey = trimmedKey.replace(/^"|"$/g, "");
    
    await fs.writeFile(this.sessionKeyPath, trimmedKey, { mode: 0o600, encoding: "utf-8" });
  }

  private getHeaders(sessionKey: string): HeadersInit {
      return {
        "Cookie": `sessionKey=${sessionKey}`,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://claude.ai",
        "Referer": "https://claude.ai/",
      };
  }

  async fetchOrganizationId(sessionKey: string): Promise<string> {
    const response = await fetch(`${CLAUDE_API_BASE_URL}/organizations`, {
      headers: this.getHeaders(sessionKey),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ClaudeUsageService] Organization fetch failed: ${response.status} ${response.statusText}`, errorText);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      throw new Error(`Server error: ${response.status}`);
    }

    const organizations = (await response.json()) as AccountInfo[];
    if (!organizations.length) {
      throw new Error("No organizations found");
    }
    return organizations[0].uuid;
  }

  private async performRequest(endpoint: string, sessionKey: string): Promise<any> {
    const response = await fetch(`${CLAUDE_API_BASE_URL}${endpoint}`, {
      headers: this.getHeaders(sessionKey),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ClaudeUsageService] Request to ${endpoint} failed: ${response.status} ${response.statusText}`, errorText);

        if (response.status === 401 || response.status === 403) {
            throw new Error("Unauthorized");
        }
      throw new Error(`Server error: ${response.status}`);
    }

    return response.json();
  }
  
  // Helper to calculate next Monday 12:59 PM (similar to Swift's Date extension)
  private getNextMonday1259pm(): Date {
      const now = new Date();
      const result = new Date(now);
      
      // Calculate days until next Monday
      // getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
      // If today is Monday (1), we want next Monday (7 days away)
      // If today is Tuesday (2), we want next Monday (6 days away)
      const currentDay = now.getDay();
      let daysUntilMonday = (1 + 7 - currentDay) % 7;
      if (daysUntilMonday === 0) daysUntilMonday = 7;
      
      result.setDate(result.getDate() + daysUntilMonday);
      result.setHours(12, 59, 0, 0);
      return result;
  }

  async fetchUsageData(): Promise<ClaudeUsage> {
    const sessionKey = await this.getSessionKey();
    const orgId = await this.fetchOrganizationId(sessionKey);

    const usagePromise = this.performRequest(`/organizations/${orgId}/usage`, sessionKey);
    // For now, let's assume checkOverage is always attempted if we are fetching usage, 
    // we can make it optional later if needed or controlled by a flag passed in.
    // In the Swift app, it reads from UserDefaults.
    const overagePromise = this.performRequest(`/organizations/${orgId}/overage_spend_limit`, sessionKey).catch(() => null);

    const [usageData, overageData] = await Promise.all([usagePromise, overagePromise]);

    return this.parseUsageResponse(usageData, overageData);
  }

  private parseUsageResponse(json: any, overageData: OverageSpendLimitResponse | null): ClaudeUsage {
    // Session (five_hour)
    let sessionPercentage = 0.0;
    let sessionResetTime = new Date(Date.now() + 5 * 3600 * 1000); // Default +5h

    if (json.five_hour) {
        if (typeof json.five_hour.utilization === 'number') {
            sessionPercentage = json.five_hour.utilization;
        }
        if (json.five_hour.resets_at) {
            sessionResetTime = new Date(json.five_hour.resets_at);
        }
    }

    // Weekly (seven_day)
    let weeklyPercentage = 0.0;
    let weeklyResetTime = this.getNextMonday1259pm();

    if (json.seven_day) {
         if (typeof json.seven_day.utilization === 'number') {
             weeklyPercentage = json.seven_day.utilization;
         }
         if (json.seven_day.resets_at) {
             weeklyResetTime = new Date(json.seven_day.resets_at);
         }
    }

    // Opus Weekly
    let opusPercentage = 0.0;
    if (json.seven_day_opus && typeof json.seven_day_opus.utilization === 'number') {
        opusPercentage = json.seven_day_opus.utilization;
    }

    const weeklyTokens = Math.floor(WEEKLY_LIMIT * (weeklyPercentage / 100.0));
    const opusTokens = Math.floor(WEEKLY_LIMIT * (opusPercentage / 100.0));
    
    // Overage
    let costUsed: number | null = null;
    let costLimit: number | null = null;
    let costCurrency: string | null = null;
    
    if (overageData && overageData.is_enabled) {
        costUsed = overageData.used_credits;
        costLimit = overageData.monthly_credit_limit;
        costCurrency = overageData.currency;
    }

    return {
        sessionTokensUsed: 0, // Unknown
        sessionLimit: 0, // Unknown
        sessionPercentage,
        sessionResetTime: sessionResetTime.toISOString(),
        weeklyTokensUsed: weeklyTokens,
        weeklyLimit: WEEKLY_LIMIT,
        weeklyPercentage,
        weeklyResetTime: weeklyResetTime.toISOString(),
        opusWeeklyTokensUsed: opusTokens,
        opusWeeklyPercentage: opusPercentage,
        costUsed,
        costLimit,
        costCurrency,
        lastUpdated: new Date().toISOString(),
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}
