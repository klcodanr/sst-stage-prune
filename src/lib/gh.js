import { run } from "./run.js";

/**
 * Gets the open PR numbers using the GH CLI
 * @returns a set of the PR numbers
 */
export const getOpenPrNumbers = async () => {
  const { stdout } = await run("gh", [
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

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number(line))
    .filter(Number.isInteger);
};
