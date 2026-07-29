import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { DEFAULT_ANTHROPIC_MODEL } from "@powerbi-copilot/rdl-copilot";

export interface SecureStorage {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

const preferencesSchema = z
  .object({
    version: z.literal(1),
    model: z.string().trim().min(1).max(128),
    privacyAcknowledged: z.boolean(),
  })
  .strict();

export class LlmSettingsStore {
  private sessionKey: string | undefined = process.env.ANTHROPIC_API_KEY;
  private connectionVerified = false;

  constructor(
    private readonly userDataPath: string,
    private readonly secureStorage: SecureStorage,
  ) {}

  private get encryptedKeyPath(): string {
    return join(this.userDataPath, "anthropic-api-key.encrypted");
  }

  private get preferencesPath(): string {
    return join(this.userDataPath, "llm-planner-settings.json");
  }

  async getPreferences(): Promise<{
    model: string;
    privacyAcknowledged: boolean;
  }> {
    try {
      const parsed = preferencesSchema.parse(
        JSON.parse(await readFile(this.preferencesPath, "utf8")),
      );
      return {
        model: process.env.ANTHROPIC_MODEL ?? parsed.model,
        privacyAcknowledged: parsed.privacyAcknowledged,
      };
    } catch {
      return {
        model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
        privacyAcknowledged: false,
      };
    }
  }

  async setPreferences(input: {
    model: string;
    privacyAcknowledged: boolean;
  }): Promise<void> {
    await writeFile(
      this.preferencesPath,
      `${JSON.stringify(preferencesSchema.parse({ version: 1, ...input }), null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }

  async setApiKey(key: string, persist: boolean): Promise<void> {
    this.sessionKey = z.string().trim().min(20).max(512).parse(key);
    this.connectionVerified = false;
    if (persist && this.secureStorage.isEncryptionAvailable())
      await writeFile(
        this.encryptedKeyPath,
        this.secureStorage.encryptString(this.sessionKey),
        { mode: 0o600 },
      );
  }

  async apiKey(): Promise<string | undefined> {
    if (this.sessionKey) return this.sessionKey;
    if (!this.secureStorage.isEncryptionAvailable()) return undefined;
    try {
      this.sessionKey = this.secureStorage.decryptString(
        await readFile(this.encryptedKeyPath),
      );
      return this.sessionKey;
    } catch {
      return undefined;
    }
  }

  async clearApiKey(): Promise<void> {
    this.sessionKey = undefined;
    this.connectionVerified = false;
    await unlink(this.encryptedKeyPath).catch(() => undefined);
  }

  markConnectionVerified(value: boolean): void {
    this.connectionVerified = value;
  }

  async status(): Promise<{
    keyStatus:
      | "notConfigured"
      | "configured"
      | "connectionVerified"
      | "connectionFailed";
    persistenceAvailable: boolean;
    model: string;
    privacyAcknowledged: boolean;
  }> {
    const preferences = await this.getPreferences();
    return {
      keyStatus: this.connectionVerified
        ? "connectionVerified"
        : (await this.apiKey())
          ? "configured"
          : "notConfigured",
      persistenceAvailable: this.secureStorage.isEncryptionAvailable(),
      ...preferences,
    };
  }
}
