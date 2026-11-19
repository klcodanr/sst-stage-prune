import { execFile } from "node:child_process";

/**
 * Runs a command and returns a promise with the results
 * @param {string} command the command to run
 * @param {string[]} args the arguments to pass to the command
 * @param {import('node:child_process').ExecFileOptionsWithBufferEncoding & {streamLogs?: boolean}} options the options for the run
 * @returns the results of the run
 */
export const run = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const { streamLogs, ...execOptions } = options;
    const child = execFile(
      command,
      args,
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      },
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        ...execOptions,
      },
    );
    if (streamLogs) {
      child.stdout.on("data", (data) => process.stdout.write(data.toString()));
      child.stderr.on("data", (data) => process.stderr.write(data.toString()));
    }
  });
};
