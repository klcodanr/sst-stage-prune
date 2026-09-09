import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/run.js", () => ({
  run: vi.fn(),
}));

import { run } from "../../src/lib/run.js";
import {
  getAppInfo,
  isStageLocked,
  removeStage,
  unlockStage,
} from "../../src/lib/sst.js";

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

  it("unlocks a locked stage and retries removal", async () => {
    vi.mocked(run)
      .mockRejectedValueOnce(
        Object.assign(new Error("command failed"), {
          stderr:
            "Locked A concurrent update was detected on the app. Run `sst unlock` to remove the lock and try again.",
        }),
      )
      .mockResolvedValue({ stdout: "", stderr: "" });

    await removeStage("PR-123", { pkgMgr: "yarn", sstScript: "my-sst" });

    expect(run).toHaveBeenNthCalledWith(
      1,
      "yarn",
      ["run", "my-sst", "--", "remove", "--stage", "PR-123"],
      { stdio: "inherit", streamLogs: true },
    );
    expect(run).toHaveBeenNthCalledWith(
      2,
      "yarn",
      ["run", "my-sst", "--", "unlock", "--stage", "PR-123"],
      { stdio: "inherit", streamLogs: true },
    );
    expect(run).toHaveBeenNthCalledWith(
      3,
      "yarn",
      ["run", "my-sst", "--", "remove", "--stage", "PR-123"],
      { stdio: "inherit", streamLogs: true },
    );
  });

  it("does not unlock for unrelated removal errors", async () => {
    vi.mocked(run).mockRejectedValue(new Error("permission denied"));

    await expect(
      removeStage("PR-123", { pkgMgr: "npm", sstScript: "sst" }),
    ).rejects.toThrow("permission denied");
    expect(run).toHaveBeenCalledTimes(1);
  });
});

describe("isStageLocked", () => {
  it("detects lock errors in stderr", () => {
    expect(
      isStageLocked({
        message: "command failed",
        stderr:
          "Locked A concurrent update was detected on the app. Run `sst unlock` to remove the lock and try again.",
      }),
    ).toBe(true);
  });

  it("ignores errors unrelated to a locked stage or state", () => {
    expect(isStageLocked(new Error("permission denied"))).toBe(false);
  });

  it("ignores lock errors without SST's unlock recommendation", () => {
    expect(isStageLocked({ stderr: "Locked resource" })).toBe(false);
  });
});

describe("unlockStage", () => {
  it("runs sst unlock for the selected stage", async () => {
    vi.mocked(run).mockResolvedValue({ stdout: "", stderr: "" });

    await unlockStage("PR-123", { pkgMgr: "pnpm", sstScript: "sst" });

    expect(run).toHaveBeenCalledWith(
      "pnpm",
      ["run", "sst", "--", "unlock", "--stage", "PR-123"],
      { stdio: "inherit", streamLogs: true },
    );
  });
});
