import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/run.js", () => ({
  run: vi.fn(),
}));

import { run } from "../../src/lib/run.js";
import { getAppInfo, removeStage } from "../../src/lib/sst.js";

describe("getAppInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes sst state list using selected package manager and script", async () => {
    vi.mocked(run).mockResolvedValue({
      stdout: "App: test-app\nStages: PR-10",
      stderr: "",
    });

    await getAppInfo({ pkgMgr: "pnpm", sstScript: "sst" });

    expect(run).toHaveBeenCalledWith("pnpm", [
      "run",
      "sst",
      "--",
      "state",
      "list",
    ]);
  });

  it("parses single-stage output into a one-item Stages array", async () => {
    vi.mocked(run).mockResolvedValue({
      stdout: [
        "App:        test-app",
        "Provider:   AWS",
        "Stages:     PR-111",
      ].join("\n"),
      stderr: "",
    });

    await expect(
      getAppInfo({ pkgMgr: "npm", sstScript: "sst" }),
    ).resolves.toEqual({
      App: "test-app",
      Stages: ["PR-111"],
    });
  });

  it("parses multi-stage output into a Stages array", async () => {
    vi.mocked(run).mockResolvedValue({
      stdout: [
        "App:        test-app",
        "Provider:   AWS",
        "Stages:     PR-111",
        "            PR-167",
        "            dev",
      ].join("\n"),
      stderr: "",
    });

    await expect(
      getAppInfo({ pkgMgr: "npm", sstScript: "sst" }),
    ).resolves.toEqual({
      App: "test-app",
      Stages: ["PR-111", "PR-167", "dev"],
    });
  });
});

describe("removeStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs sst remove with stage and streaming options", async () => {
    vi.mocked(run).mockResolvedValue({ stdout: "", stderr: "" });

    await removeStage("PR-123", { pkgMgr: "yarn", sstScript: "my-sst" });

    expect(run).toHaveBeenCalledWith(
      "yarn",
      ["run", "my-sst", "--", "remove", "--stage", "PR-123"],
      {
        stdio: "inherit",
        streamLogs: true,
      },
    );
  });
});
