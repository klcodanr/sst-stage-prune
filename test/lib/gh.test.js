import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/run.js", () => ({
  run: vi.fn(),
}));

import { getOpenPrNumbers } from "../../src/lib/gh.js";
import { run } from "../../src/lib/run.js";

describe("getOpenPrNumbers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs gh pr list with expected args", async () => {
    vi.mocked(run).mockResolvedValue({ stdout: "", stderr: "" });

    await getOpenPrNumbers();

    expect(run).toHaveBeenCalledWith("gh", [
      "pr",
      "list",
      "--state",
      "open",
      "--limit",
      "1000",
      "--json",
      "number",
      "--jq",
      ".[].number",
    ]);
  });

  it("parses integer PR numbers and filters invalid lines", async () => {
    vi.mocked(run).mockResolvedValue({
      stdout: "12\n\nabc\n 44 \n1.1\n100\n",
      stderr: "",
    });

    await expect(getOpenPrNumbers()).resolves.toEqual([12, 44, 100]);
  });
});
