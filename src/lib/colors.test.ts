import { describe, expect, it } from "vitest";
import { colorName, readableTextOn } from "./colors";

describe("readableTextOn", () => {
  it("texto blanco sobre colores oscuros y oscuro sobre claros", () => {
    expect(readableTextOn("#0e5a36")).toBe("#ffffff");
    expect(readableTextOn("#111827")).toBe("#ffffff");
    expect(readableTextOn("#ffd23f")).toBe("#14201a");
    expect(readableTextOn("#ffffff")).toBe("#14201a");
  });
});

describe("colorName", () => {
  it("nombra los colores conocidos", () => {
    expect(colorName("#C8102E")).toBe("Rojo");
    expect(colorName("#123456")).toBe("Color");
  });
});
