const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Claude CLI Detector
 *
 * Authentication options:
 * 1. OAuth Token (Subscription): User runs `claude setup-token` and provides the token to the app
 * 2. API Key (Pay-per-use): User provides their Anthropic API key directly
 */
class ClaudeCliDetector {
  /**
   * Check if Claude Code CLI is installed and accessible
   * @returns {Object} { installed: boolean, path: string|null, version: string|null, method: 'cli'|'none' }
   */
  /**
   * Try to get updated PATH from shell config files
   * This helps detect CLI installations that modify shell config but haven't updated the current process PATH
   */
  static getUpdatedPathFromShellConfig() {
    const homeDir = os.homedir();
    const shell = process.env.SHELL || "/bin/bash";
    const shellName = path.basename(shell);

    // Common shell config files
    const configFiles = [];
    if (shellName.includes("zsh")) {
      configFiles.push(path.join(homeDir, ".zshrc"));
      configFiles.push(path.join(homeDir, ".zshenv"));
      configFiles.push(path.join(homeDir, ".zprofile"));
    } else if (shellName.includes("bash")) {
      configFiles.push(path.join(homeDir, ".bashrc"));
      configFiles.push(path.join(homeDir, ".bash_profile"));
      configFiles.push(path.join(homeDir, ".profile"));
    }

    // Also check common locations
    const commonPaths = [
      path.join(homeDir, ".local", "bin"),
      path.join(homeDir, ".cargo", "bin"),
      "/usr/local/bin",
      "/opt/homebrew/bin",
      path.join(homeDir, "bin"),
    ];

    // Try to extract PATH additions from config files
    for (const configFile of configFiles) {
      if (fs.existsSync(configFile)) {
        try {
          const content = fs.readFileSync(configFile, "utf-8");
          // Look for PATH exports that might include claude installation paths
          const pathMatches = content.match(
            /export\s+PATH=["']?([^"'\n]+)["']?/g
          );
          if (pathMatches) {
            for (const match of pathMatches) {
              const pathValue = match
                .replace(/export\s+PATH=["']?/, "")
                .replace(/["']?$/, "");
              const paths = pathValue
                .split(":")
                .filter((p) => p && !p.includes("$"));
              commonPaths.push(...paths);
            }
          }
        } catch (error) {
          // Ignore errors reading config files
        }
      }
    }

    return [...new Set(commonPaths)]; // Remove duplicates
  }

  static detectClaudeInstallation() {
    console.log("[ClaudeCliDetector] Detecting Claude installation...");

    try {
      // Method 1: Check if 'claude' command is in PATH (Unix)
      if (process.platform !== "win32") {
        try {
          const claudePath = execSync("which claude 2>/dev/null", {
            encoding: "utf-8",
          }).trim();
          if (claudePath) {
            const version = this.getClaudeVersion(claudePath);
            console.log(
              "[ClaudeCliDetector] Found claude at:",
              claudePath,
              "version:",
              version
            );
            return {
              installed: true,
              path: claudePath,
              version: version,
              method: "cli",
            };
          }
        } catch (error) {
          // CLI not in PATH, continue checking other locations
        }
      }

      // Method 2: Check Windows path
      if (process.platform === "win32") {
        try {
          const claudePath = execSync("where claude 2>nul", {
            encoding: "utf-8",
          })
            .trim()
            .split("\n")[0];
          if (claudePath) {
            const version = this.getClaudeVersion(claudePath);
            console.log(
              "[ClaudeCliDetector] Found claude at:",
              claudePath,
              "version:",
              version
            );
            return {
              installed: true,
              path: claudePath,
              version: version,
              method: "cli",
            };
          }
        } catch (error) {
          // Not found on Windows
        }
      }

      // Method 3: Check for local installation
      const localClaudePath = path.join(
        os.homedir(),
        ".claude",
        "local",
        "claude"
      );
      if (fs.existsSync(localClaudePath)) {
        const version = this.getClaudeVersion(localClaudePath);
        console.log(
          "[ClaudeCliDetector] Found local claude at:",
          localClaudePath,
          "version:",
          version
        );
        return {
          installed: true,
          path: localClaudePath,
          version: version,
          method: "cli-local",
        };
      }

      // Method 4: Check common installation locations (including those from shell config)
      const commonPaths = this.getUpdatedPathFromShellConfig();
      const binaryNames = ["claude", "claude-code"];

      for (const basePath of commonPaths) {
        for (const binaryName of binaryNames) {
          const claudePath = path.join(basePath, binaryName);
          if (fs.existsSync(claudePath)) {
            try {
              const version = this.getClaudeVersion(claudePath);
              console.log(
                "[ClaudeCliDetector] Found claude at:",
                claudePath,
                "version:",
                version
              );
              return {
                installed: true,
                path: claudePath,
                version: version,
                method: "cli",
              };
            } catch (error) {
              // File exists but can't get version, might not be executable
            }
          }
        }
      }

      // Method 5: Try to source shell config and check PATH again (for Unix)
      if (process.platform !== "win32") {
        try {
          const shell = process.env.SHELL || "/bin/bash";
          const shellName = path.basename(shell);
          const homeDir = os.homedir();

          let sourceCmd = "";
          if (shellName.includes("zsh")) {
            sourceCmd = `source ${homeDir}/.zshrc 2>/dev/null && which claude`;
          } else if (shellName.includes("bash")) {
            sourceCmd = `source ${homeDir}/.bashrc 2>/dev/null && which claude`;
          }

          if (sourceCmd) {
            const claudePath = execSync(`bash -c "${sourceCmd}"`, {
              encoding: "utf-8",
              timeout: 2000,
            }).trim();
            if (claudePath && claudePath.startsWith("/")) {
              const version = this.getClaudeVersion(claudePath);
              console.log(
                "[ClaudeCliDetector] Found claude via shell config at:",
                claudePath,
                "version:",
                version
              );
              return {
                installed: true,
                path: claudePath,
                version: version,
                method: "cli",
              };
            }
          }
        } catch (error) {
          // Failed to source shell config or find claude
        }
      }

      console.log("[ClaudeCliDetector] Claude CLI not found");
      return {
        installed: false,
        path: null,
        version: null,
        method: "none",
      };
    } catch (error) {
      console.error(
        "[ClaudeCliDetector] Error detecting Claude installation:",
        error
      );
      return {
        installed: false,
        path: null,
        version: null,
        method: "none",
        error: error.message,
      };
    }
  }

  /**
   * Get Claude CLI version
   * @param {string} claudePath Path to claude executable
   * @returns {string|null} Version string or null
   */
  static getClaudeVersion(claudePath) {
    try {
      const version = execSync(`"${claudePath}" --version 2>/dev/null`, {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
      return version || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get authentication status
   * Checks for:
   * 1. OAuth token stored in app's credentials (from `claude setup-token`)
   * 2. API key stored in app's credentials
   * 3. API key in environment variable
   *
   * @param {string} appCredentialsPath Path to app's credentials.json
   * @returns {Object} Authentication status
   */
  static getAuthStatus(appCredentialsPath) {
    console.log("[ClaudeCliDetector] Checking auth status...");

    const envApiKey = process.env.ANTHROPIC_API_KEY;
    console.log("[ClaudeCliDetector] Env ANTHROPIC_API_KEY:", !!envApiKey);

    // Check app's stored credentials
    let storedOAuthToken = null;
    let storedApiKey = null;

    if (appCredentialsPath && fs.existsSync(appCredentialsPath)) {
      try {
        const content = fs.readFileSync(appCredentialsPath, "utf-8");
        const credentials = JSON.parse(content);
        storedOAuthToken = credentials.anthropic_oauth_token || null;
        storedApiKey =
          credentials.anthropic || credentials.anthropic_api_key || null;
        console.log("[ClaudeCliDetector] App credentials:", {
          hasOAuthToken: !!storedOAuthToken,
          hasApiKey: !!storedApiKey,
        });
      } catch (error) {
        console.error(
          "[ClaudeCliDetector] Error reading app credentials:",
          error
        );
      }
    }

    // Determine authentication method
    // Priority: Stored OAuth Token > Stored API Key > Env API Key
    let authenticated = false;
    let method = "none";

    if (storedOAuthToken) {
      authenticated = true;
      method = "oauth_token";
      console.log(
        "[ClaudeCliDetector] Using stored OAuth token (subscription)"
      );
    } else if (storedApiKey) {
      authenticated = true;
      method = "api_key";
      console.log("[ClaudeCliDetector] Using stored API key");
    } else if (envApiKey) {
      authenticated = true;
      method = "api_key_env";
      console.log("[ClaudeCliDetector] Using environment API key");
    } else {
      console.log("[ClaudeCliDetector] No authentication found");
    }

    const result = {
      authenticated,
      method,
      hasStoredOAuthToken: !!storedOAuthToken,
      hasStoredApiKey: !!storedApiKey,
      hasEnvApiKey: !!envApiKey,
    };

    console.log("[ClaudeCliDetector] Auth status result:", result);
    return result;
  }
  /**
   * Get installation info (installation status only, no auth)
   * @returns {Object} Installation info with status property
   */
  static getInstallationInfo() {
    const installation = this.detectClaudeInstallation();
    return {
      status: installation.installed ? "installed" : "not_installed",
      installed: installation.installed,
      path: installation.path,
      version: installation.version,
      method: installation.method,
    };
  }

  /**
   * Get full status including installation and auth
   * @param {string} appCredentialsPath Path to app's credentials.json
   * @returns {Object} Full status
   */
  static getFullStatus(appCredentialsPath) {
    const installation = this.detectClaudeInstallation();
    const auth = this.getAuthStatus(appCredentialsPath);

    return {
      success: true,
      status: installation.installed ? "installed" : "not_installed",
      installed: installation.installed,
      path: installation.path,
      version: installation.version,
      method: installation.method,
      auth,
    };
  }

  /**
   * Get installation commands for different platforms
   * @returns {Object} Installation commands
   */
  static getInstallCommands() {
    return {
      macos: "curl -fsSL https://claude.ai/install.sh | bash",
      windows: "irm https://claude.ai/install.ps1 | iex",
      linux: "curl -fsSL https://claude.ai/install.sh | bash",
    };
  }

  /**
   * Install Claude CLI using the official script
   * @param {Function} onProgress Callback for progress updates
   * @returns {Promise<Object>} Installation result
   */
  static async installCli(onProgress) {
    return new Promise((resolve, reject) => {
      const platform = process.platform;
      let command, args;

      if (platform === "win32") {
        command = "powershell";
        args = ["-Command", "irm https://claude.ai/install.ps1 | iex"];
      } else {
        command = "bash";
        args = ["-c", "curl -fsSL https://claude.ai/install.sh | bash"];
      }

      console.log("[ClaudeCliDetector] Installing Claude CLI...");

      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });

      let output = "";
      let errorOutput = "";

      proc.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;
        if (onProgress) {
          onProgress({ type: "stdout", data: text });
        }
      });

      proc.stderr.on("data", (data) => {
        const text = data.toString();
        errorOutput += text;
        if (onProgress) {
          onProgress({ type: "stderr", data: text });
        }
      });

      proc.on("close", (code) => {
        if (code === 0) {
          console.log(
            "[ClaudeCliDetector] Installation completed successfully"
          );
          resolve({
            success: true,
            output,
            message: "Claude CLI installed successfully",
          });
        } else {
          console.error(
            "[ClaudeCliDetector] Installation failed with code:",
            code
          );
          reject({
            success: false,
            error: errorOutput || `Installation failed with code ${code}`,
            output,
          });
        }
      });

      proc.on("error", (error) => {
        console.error("[ClaudeCliDetector] Installation error:", error);
        reject({
          success: false,
          error: error.message,
          output,
        });
      });
    });
  }

  /**
   * Get instructions for setup-token command
   * @returns {Object} Setup token instructions
   */
  static getSetupTokenInstructions() {
    const detection = this.detectClaudeInstallation();

    if (!detection.installed) {
      return {
        success: false,
        error: "Claude CLI is not installed. Please install it first.",
        installCommands: this.getInstallCommands(),
      };
    }

    return {
      success: true,
      command: "claude setup-token",
      instructions: [
        "1. Open your terminal",
        "2. Run: claude setup-token",
        "3. Follow the prompts to authenticate",
        "4. Copy the token that is displayed",
        "5. Paste the token in the field below",
      ],
      note: "This token is from your Claude subscription and allows you to use Claude without API charges.",
    };
  }
}

module.exports = ClaudeCliDetector;
