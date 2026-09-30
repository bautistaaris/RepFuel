import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("supersecret");
    expect(await verifyPassword("wrongpass", hash)).toBe(false);
  });

  it("produces bcrypt-format hashes", async () => {
    const hash = await hashPassword("hello");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });
});