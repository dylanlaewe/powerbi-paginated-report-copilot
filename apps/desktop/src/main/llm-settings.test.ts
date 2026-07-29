import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LlmSettingsStore, type SecureStorage } from "./llm-settings";

const encryptedStorage: SecureStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) =>
    Buffer.from([...Buffer.from(value)].map((byte) => byte ^ 0xaa)),
  decryptString: (value) =>
    Buffer.from([...value].map((byte) => byte ^ 0xaa)).toString("utf8"),
};

describe("LlmSettingsStore", () => {
  it("persists an API key only through secure encryption", async () => {
    const directory = await mkdtemp(join(tmpdir(), "llm-settings-"));
    const store = new LlmSettingsStore(directory, encryptedStorage);
    const key = "sk-ant-test-key-that-is-never-plaintext";
    await store.setApiKey(key, true);
    const bytes = await readFile(
      join(directory, "anthropic-api-key.encrypted"),
    );
    expect(bytes.toString("utf8")).not.toContain(key);
    expect(
      await new LlmSettingsStore(directory, encryptedStorage).apiKey(),
    ).toBe(key);
  });

  it("uses session-only storage when encryption is unavailable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "llm-session-"));
    const unavailable: SecureStorage = {
      isEncryptionAvailable: () => false,
      encryptString: () => {
        throw new Error("not available");
      },
      decryptString: () => {
        throw new Error("not available");
      },
    };
    const store = new LlmSettingsStore(directory, unavailable);
    const key = "sk-ant-session-key-that-is-not-persisted";
    await store.setApiKey(key, true);
    expect(await store.apiKey()).toBe(key);
    expect((await store.status()).persistenceAvailable).toBe(false);
  });
});
