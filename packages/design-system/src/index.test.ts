import { describe, expect, it } from "vitest";
import { color, formatInrPaise } from "./index";

describe("tokens", () => {
  it("uses Stitch lilac canvas", () => {
    expect(color.canvas).toBe("#E9E4FA");
    expect(color.primary).toBe("#7C5CE6");
  });

  it("formats paise as INR", () => {
    expect(formatInrPaise(3333n)).toBe("₹33.33");
  });
});
