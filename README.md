# sst-stage-prune

`sst-stage-prune` supports identifying and pruning SST Stages.

When PR environments are left behind, they create drag:

- **Cost creep** from unused cloud resources.
- **Operational noise** from stale stages that look active but are not.
- **Deployment failures** from limit overruns.

This tool automates that hygiene by reconciling SST stages with currently open GitHub PRs and removing PR stages that no longer map to an active PR.


## Example Issues

Here's a few errors that I have run into due to excessive stale PR Stages:

### Cloud Front Function Limit

Having ~75 stale PR environments caused a deployment failure on an unrelated project in the same tenant due to too many Cloud Front Functions:

```
Site sst:aws:StaticSite → SiteCloudfrontFunctionRequest aws:cloudfront:Function
sdk-v2/provider2.go:572: sdk.helper_schema: creating CloudFront Function (thecaringplace-inf-PR-543-SiteCloudfrontFunctionRequest-uswnrdwz): operation error CloudFront: CreateFunction, https response error StatusCode: 400, RequestID: ecaa9052-7393-40c5-b752-80805190faaa, TooManyFunctions: : provider=aws@7.20.0
```

## Requirements

- Node.js
- GitHub CLI (`gh`) installed and authenticated
- An SST project with a runnable SST script (default script name: `sst`)

## SST Versions

This script should work with v3-4 of SST, however I've primarily verified it with v4.17.0 and v3.19.3. If you have any problems, [open an issue](https://github.com/klcodanr/sst-stage-prune/issues/new) and provide:

- The SST version
- What failed (ideally with the full console output)
- The results of `npm run sst -- state list` or the equivalent command with your package manager

## Usage

Run from the root of your SST project:

```bash
sst-stage-prune [options]
sst-stage-prune cleanup-pr-stages [options]
```

You can also run locally in this repo with:

```bash
npm start -- [options]
```

## Options

- `--dry-run`: List stale PR stages without removing them.
- `--pkg-mgr <pkgMgr>`: Package manager used to run SST (`npm`, `pnpm`, `yarn`). Default: `npm`.
- `--sst-script <sstScript>`: Script name used to invoke SST. Default: `sst`.
- `--pr-stage-format <prStageFormat>`: String template for PR stages, using `{}` as PR placeholder. Default: `PR-{}`.
- `--pr-stage-pattern <prStagePattern>`: Regex used to detect PR stages. Default: `PR-\d+`.

## Example

```bash
sst-stage-prune cleanup-pr-stages --dry-run --pkg-mgr pnpm --sst-script sst
```
