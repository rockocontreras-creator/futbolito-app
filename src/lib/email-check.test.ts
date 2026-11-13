import { describe, expect, it } from "vitest";
import { emailDomain, isDisposableDomain, plausibleDomain, suggestEmail } from "./email-check";

describe("email-check", () => {
  it("saca el dominio", () => {
    expect(emailDomain(" Rocko@Gmail.com ")).toBe("gmail.com");
  });
  it("detecta correos desechables y sus subdominios", () => {
    expect(isDisposableDomain("mailinator.com")).toBe(true);
    expect(isDisposableDomain("abc.yopmail.com")).toBe(true);
    expect(isDisposableDomain("gmail.com")).toBe(false);
  });
  it("sugiere el dominio correcto en errores de tipeo", () => {
    expect(suggestEmail("juan@gmial.com")).toBe("juan@gmail.com");
    expect(suggestEmail("juan@gmail.co")).toBe("juan@gmail.com");
    expect(suggestEmail("juan@hotmial.com")).toBe("juan@hotmail.com");
    expect(suggestEmail("juan@gmail.com")).toBeNull();
    expect(suggestEmail("juan@municipalidad.cl")).toBeNull();
  });
  it("exige un dominio con forma razonable", () => {
    expect(plausibleDomain("gmail.com")).toBe(true);
    expect(plausibleDomain("adjkdjas.com")).toBe(true); // la forma es válida: lo frena la revisión DNS
    expect(plausibleDomain("localhost")).toBe(false);
    expect(plausibleDomain("a.b")).toBe(false);
  });
});
