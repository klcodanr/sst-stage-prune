import { array, object, pipe, string, transform, union } from "zod/v4-mini";
import { run } from "./run.js";

const sstOutputSchema = object({
  App: string(),
  Stages: pipe(
    union([string(), array(string())]),
    transform((input) => {
      if (Array.isArray(input)) {
        return input;
      }
      return [input];
    }),
  ),
});

/*
App:        test-app
Provider:   AWS
Region:     us-east-2
Account:    1234567
Profile:    someprofile
Stages:     PR-111
            PR-113
            PR-167
            PR-168
            PR-472
            PR-480
            PR-543
            dev
            live
            production
*/
/**
 *
 * @param {string} output
 * @returns {import('../types.js').AppInfo}
 */
const parseOutput = (output) => {
  const data = {};
  let key;
  let values = [];
  for (const line of output.split(/\n/)) {
    const parsedLine = line
      .split(":")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (parsedLine.length === 2) {
      if (key) {
        data[key] = values.length === 1 ? values[0] : values;
      }
      key = parsedLine[0];
      values = [parsedLine[1]];
    } else if (parsedLine.length > 0) {
      values.push(parsedLine[0]);
    }
  }
  data[key] = values.length === 1 ? values[0] : values;
  return data;
};

/**
 * Gets the app info from SST
 * @param {import('../types.js').ScriptOptions} options
 */
export const getAppInfo = async ({ pkgMgr, sstScript }) => {
  const { stdout } = await run(pkgMgr, [
    "run",
    sstScript,
    "--",
    "state",
    "list",
  ]);
  const parsed = parseOutput(stdout);
  return sstOutputSchema.parse(parsed);
};

/**
 * Determines whether an SST operation failed because its state is locked.
 * SST reports a recommendation to run `sst unlock` on command stderr when
 * execFile exits unsuccessfully.
 *
 * @param {unknown} error
 */
export const isStageLocked = (error) => {
  const message = [error?.message, error?.stderr]
    .filter((value) => typeof value === "string")
    .join(" ");

  return /\brun\s+[`"]?sst unlock\b/i.test(message);
};

/**
 * Releases SST's lock for a stage.
 *
 * @param {string} stage
 * @param {import('../types.js').ScriptOptions} options
 */
export const unlockStage = async (stage, options) =>
  run(
    options.pkgMgr,
    ["run", options.sstScript, "--", "unlock", "--stage", stage],
    {
      stdio: "inherit",
      streamLogs: true,
    },
  );

/**
 *
 * @param {string} stage
 * @param {import('../types.js').ScriptOptions} options
 */
export const removeStage = async (stage, options) => {
  try {
    return await run(
      options.pkgMgr,
      ["run", options.sstScript, "--", "remove", "--stage", stage],
      {
        stdio: "inherit",
        streamLogs: true,
      },
    );
  } catch (error) {
    if (!isStageLocked(error)) {
      throw error;
    }

    await unlockStage(stage, options);
    return run(
      options.pkgMgr,
      ["run", options.sstScript, "--", "remove", "--stage", stage],
      {
        stdio: "inherit",
        streamLogs: true,
      },
    );
  }
};
