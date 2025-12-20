export interface UsagePeriod {
  period: string;
  usage_type: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

export interface UsageResponse {
  usage: UsagePeriod[];
}

export interface AccountInfo {
  uuid: string;
  name: string;
  capabilities: string[];
}

export interface OverageSpendLimitResponse {
  monthly_credit_limit: number | null;
  currency: string | null;
  used_credits: number | null;
  is_enabled: boolean | null;
}

export interface ClaudeUsage {
  sessionTokensUsed: number;
  sessionLimit: number;
  sessionPercentage: number;
  sessionResetTime: string; // ISO date string

  weeklyTokensUsed: number;
  weeklyLimit: number;
  weeklyPercentage: number;
  weeklyResetTime: string; // ISO date string

  opusWeeklyTokensUsed: number;
  opusWeeklyPercentage: number;

  costUsed: number | null;
  costLimit: number | null;
  costCurrency: string | null;

  lastUpdated: string; // ISO date string
  userTimezone: string;
}

export interface ClaudeStatus {
    indicator: {
        color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
    };
    description: string;
}
