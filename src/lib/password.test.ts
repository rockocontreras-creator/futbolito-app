import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifica la contraseña correcta y rechaza otra", async () => {
    const hash = await hashPassword("pichanga123");
    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("pichanga123", hash)).toBe(true);
    expect(await verifyPassword("pichanga124", hash)).toBe(false);
  });

  it("usa una sal distinta cada vez", async () => {
    expect(await hashPassword("igual")).not.toBe(await hashPassword("igual"));
  });

  it("rechaza hashes vacíos o mal formados", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false);
  });
});
