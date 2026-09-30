import { describe, expect, it } from "vitest";
import { createSessionToken, decodeSessionToken } from "@/lib/session";
import crypto from "node:crypto";

describe("session token", () => {
  const OLD_ENV = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-secret-32-chars-xxxxxxxxxxxxx";

  it("roundtrips a valid userId", () => {
    const tok = createSessionToken("user_abc");
    const decoded = decodeSessionToken(tok);
    expect(decoded?.userId).toBe("user_abc");
  });

  it("rejects a tampered token", () => {
    const tok = createSessionToken("user_abc");
    const tampered = tok.slice(0, -3) + "ZZZ";
    expect(decodeSessionToken(tampered)).toBeNull();
  });

  it("rejects a token with random data", () => {
    const fake = "abc.def";
    expect(decodeSessionToken(fake)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const fakePayload = Buffer.from(JSON.stringify({ userId: "user_abc", exp: Date.now() - 1000 })).toString("base64url");
    const mac = crypto.createHmac("sha256", process.env.AUTH_SECRET!).update(fakePayload).digest("base64url");
    const expired = `${fakePayload}.${mac}`;
    expect(decodeSessionToken(expired)).toBeNull();
  });

  it("restores env", () => {
    process.env.AUTH_SECRET = OLD_ENV;
    expect(true).toBe(true);
  });
});