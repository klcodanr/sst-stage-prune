import { beforeEach, describe, expect, it, vi } from "vitest";

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

import { run } from "../../src/lib/run.js";

describe("run", () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it("resolves with stdout and stderr when command succeeds", async () => {
    execFileMock.mockImplementation((_command, _args, callback, _options) => {
      callback(null, "out", "err");
      return {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
    });

    await expect(run("node", ["--version"])).resolves.toEqual({
      stdout: "out",
      stderr: "err",
    });
    expect(execFileMock).toHaveBeenCalledWith(
      "node",
      ["--version"],
      expect.any(Function),
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  });

  it("rejects when execFile returns an error", async () => {
    const error = new Error("boom");
    execFileMock.mockImplementation((_command, _args, callback, _options) => {
      callback(error, "", "");
      return {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
      };
    });

    await expect(run("node", ["bad"])).rejects.toThrow("boom");
  });

  it("streams logs to process stdout and stderr when requested", async () => {
    const onStdout = vi.fn();
    const onStderr = vi.fn();
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    execFileMock.mockImplementation((_command, _args, callback, _options) => {
      callback(null, "", "");
      return {
        stdout: { on: onStdout },
        stderr: { on: onStderr },
      };
    });

    await run("node", ["script.js"], { streamLogs: true });

    expect(onStdout).toHaveBeenCalledWith("data", expect.any(Function));
    expect(onStderr).toHaveBeenCalledWith("data", expect.any(Function));

    const stdoutHandler = onStdout.mock.calls[0][1];
    const stderrHandler = onStderr.mock.calls[0][1];

    stdoutHandler(Buffer.from("abc"));
    stderrHandler(Buffer.from("xyz"));

    expect(stdoutWrite).toHaveBeenCalledWith("abc");
    expect(stderrWrite).toHaveBeenCalledWith("xyz");

    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });
});
