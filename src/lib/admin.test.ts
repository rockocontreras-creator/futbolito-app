import { describe, expect, it } from "vitest";
import { isProtectedAdmin, userChangeProblem } from "./admin";

const base = {
  actorId: "a",
  targetId: "b",
  targetRole: "PLAYER" as const,
  targetEmail: "jugador@correo.cl",
  adminEmails: ["jefe@correo.cl"],
  action: "role" as const,
};

describe("isProtectedAdmin", () => {
  it("compara sin importar mayúsculas", () => {
    expect(isProtectedAdmin("Jefe@Correo.cl", ["jefe@correo.cl"])).toBe(true);
    expect(isProtectedAdmin("otro@correo.cl", ["jefe@correo.cl"])).toBe(false);
    expect(isProtectedAdmin(null, ["jefe@correo.cl"])).toBe(false);
  });
});

describe("userChangeProblem", () => {
  it("deja cambiar a un jugador cualquiera", () => {
    expect(userChangeProblem(base)).toBeNull();
    expect(userChangeProblem({ ...base, action: "suspend" })).toBeNull();
  });
  it("nadie se cambia a sí mismo", () => {
    expect(userChangeProblem({ ...base, targetId: "a" })).toMatch(/propia cuenta/);
  });
  it("no toca a los admin fijos", () => {
    expect(userChangeProblem({ ...base, targetEmail: "jefe@correo.cl", targetRole: "ADMIN" })).toMatch(
      /fija/,
    );
  });
  it("no suspende a un admin sin quitarle el rol antes", () => {
    expect(userChangeProblem({ ...base, targetRole: "ADMIN", action: "suspend" })).toMatch(/quítale/);
    expect(userChangeProblem({ ...base, targetRole: "ADMIN", action: "role" })).toBeNull();
  });
});
