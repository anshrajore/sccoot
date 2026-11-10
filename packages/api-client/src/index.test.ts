import { describe, expect, it } from "vitest";
import { ScootApi } from "./index";

describe("ScootApi", () => {
  it("constructs with a base url", () => {
    const api = new ScootApi("http://localhost:54321/functions/v1", async () => null);
    expect(api).toBeInstanceOf(ScootApi);
  });
});
