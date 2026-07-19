#!/usr/bin/env node
import { Option, program } from "commander";
import yoctoSpinner from "yocto-spinner";
import { getOpenPrNumbers } from "./lib/gh.js";
import { getAppInfo, removeStage } from "./lib/sst.js";

const addStalePrStageOptions = (command) =>
  command
    .option(
      "--dry-run",
      "Only check for stale stages, don't remove them",
      false,
    )
    .addOption(
      new Option("--pkg-mgr <pkgMgr>", "the package manager")
        .choices(["npm", "pnpm", "yarn"])
        .default("npm"),
    )
    .option(
      "--sst-script <sstScript>",
      "The script to run on the project to call SST",
      "sst",
    )
    .option(
      "--pr-stage-format <prStageFormat>",
      "The string format of the stage name. Use '{}' as a placeholder for the PR number",
      "PR-{}",
    )
    .option(
      "--pr-stage-pattern <prStagePattern>",
      "A regular expression to match the PR stages",
      "PR-\\d+",
    );

const stalePrStagesAction = async (options) => {
  const spinner = yoctoSpinner({
    text: "Loading app information...",
  }).start();

  /** @type {string[]} */
  let stages;
  try {
    const { Stages, App } = await getAppInfo(options);
    stages = Stages;
    spinner.info(`Found ${Stages.length} stages for app ${App}`);
  } catch (err) {
    spinner.error("Failed to get app info");
    throw err;
  }

  const prStageRegex = new RegExp(options.prStagePattern);
  spinner.start("Loading Pull Requests...");

  /** @type {number[]} */
  let openPrNumbers;
  try {
    openPrNumbers = await getOpenPrNumbers();
    spinner.info(`Found ${openPrNumbers.length} open pull requests`);
  } catch (err) {
    spinner.error("Failed to get open pull requests");
    throw err;
  }

  const openPrStages = new Set(
    openPrNumbers.map((num) => options.prStageFormat.replace("{}", num)),
  );
  const stalePrStages = stages
    .filter((s) => s.match(prStageRegex))
    .filter((stage) => !openPrStages.has(stage));
  console.log(
    `Found ${stalePrStages.length} stale PR stages: \n - ${stalePrStages.join("\n - ")}`,
  );

  if (options.dryRun) {
    spinner.success("List stale PRs complete!");
  } else {
    for (const [i, stage] of stalePrStages.entries()) {
      spinner.start(
        `[${i + 1} / ${stalePrStages.length}] Removing stage ${stage}...`,
      );
      await removeStage(stage, options)
        .then(() => {
          spinner.success(`Stage ${stage} removed`);
        })
        .catch((err) => {
          spinner.error(
            `Failed to remove stage ${stage}, error: ${err.message ?? err}`,
          );
        });
    }
  }
};

program
  .name("sst-prune")
  .description("Prune stale SST resources")
  .action(stalePrStagesAction);

addStalePrStageOptions(program);
addStalePrStageOptions(
  program
    .command("cleanup-pr-stages")
    .description("Find and remove stale PR stages from SST state"),
).action(stalePrStagesAction);

program.parse(process.argv);
