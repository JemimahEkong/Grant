import { describe, expect, it } from "vitest";
import {
  assertPrivateObjectKey,
  createSignedDownload,
  resolveR2Config,
  type R2Config,
} from "../lib/storage/r2";
import { selectDownloadableArtifact, type EntitlementView } from "../lib/storage/entitlements";

const fakeConfig: R2Config = {
  accountId: "test-account",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  bucketName: "grant-private",
  endpoint: "https://test-account.r2.cloudflarestorage.com",
};

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 60_000);

function view(overrides: Partial<EntitlementView> = {}): EntitlementView {
  return {
    purchase: { id: "pur_test", ownerId: "owner_test", status: "ready" as const },
    license: { id: "lic_test", endsAt: future },
    artifacts: [
      { kind: "audio" as const, state: "ready" as const, objectKey: "audio/morning-edit/mix.wav" },
      { kind: "license_pdf" as const, state: "ready" as const, objectKey: "licenses/lic_test/license.pdf" },
    ],
    ...overrides,
  };
}

describe("private R2 object policy", () => {
  it("accepts namespaced private keys and rejects public or traversal keys", () => {
    expect(() => assertPrivateObjectKey("audio/morning-edit/mix.wav")).not.toThrow();
    expect(() => assertPrivateObjectKey("licenses/lic_1/license.pdf")).not.toThrow();
    expect(() => assertPrivateObjectKey("../secret")).toThrow();
    expect(() => assertPrivateObjectKey("/audio/mix.wav")).toThrow();
    expect(() => assertPrivateObjectKey("https://public.example/mix.wav")).toThrow();
    expect(() => assertPrivateObjectKey("audio\\mix.wav")).toThrow();
    expect(() => assertPrivateObjectKey("other/mix.wav")).toThrow();
  });

  it("fails closed when storage credentials are missing", () => {
    expect(() => resolveR2Config({})).toThrowError(expect.objectContaining({ code: "STORAGE_NOT_CONFIGURED" }));
  });

  it("creates a short-lived presigned GET URL without a public object URL", async () => {
    const result = await createSignedDownload({
      key: "audio/morning-edit/mix.wav",
      expiresInSeconds: 120,
      config: fakeConfig,
    });
    expect(result.url).toContain("X-Amz-Signature");
    expect(result.url).toContain("test-account.r2.cloudflarestorage.com");
    expect(result.url).not.toContain("public");
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("bounds signed URL expiry", async () => {
    await expect(
      createSignedDownload({ key: "audio/mix.wav", expiresInSeconds: 10, config: fakeConfig }),
    ).rejects.toMatchObject({ code: "INVALID_URL_EXPIRY" });
    await expect(
      createSignedDownload({ key: "audio/mix.wav", expiresInSeconds: 7200, config: fakeConfig }),
    ).rejects.toMatchObject({ code: "INVALID_URL_EXPIRY" });
  });
});

describe("download entitlement checks", () => {
  it("returns a ready audio artifact only for a settled, unexpired license", () => {
    expect(selectDownloadableArtifact(view(), "audio").objectKey).toBe("audio/morning-edit/mix.wav");
  });

  it("selects the PDF artifact for a pdf download", () => {
    expect(selectDownloadableArtifact(view(), "pdf").objectKey).toBe("licenses/lic_test/license.pdf");
  });

  it("refuses an unsettled purchase", () => {
    expect(() =>
      selectDownloadableArtifact(view({ purchase: { id: "pur_test", ownerId: "owner_test", status: "reserved" } }), "audio"),
    ).toThrowError(expect.objectContaining({ code: "PURCHASE_NOT_SETTLED" }));
  });

  it("refuses a missing or expired license", () => {
    expect(() => selectDownloadableArtifact(view({ license: null }), "audio")).toThrowError(
      expect.objectContaining({ code: "LICENSE_MISSING" }),
    );
    expect(() =>
      selectDownloadableArtifact(view({ license: { id: "lic_test", endsAt: past } }), "audio"),
    ).toThrowError(expect.objectContaining({ code: "LICENSE_EXPIRED" }));
  });

  it("refuses a pending or missing artifact", () => {
    expect(() =>
      selectDownloadableArtifact(
        view({ artifacts: [{ kind: "audio", state: "pending", objectKey: "audio/morning-edit/mix.wav" }] }),
        "audio",
      ),
    ).toThrowError(expect.objectContaining({ code: "ARTIFACT_NOT_READY" }));
    expect(() => selectDownloadableArtifact(view({ artifacts: [] }), "pdf")).toThrowError(
      expect.objectContaining({ code: "ARTIFACT_NOT_READY" }),
    );
  });
});
