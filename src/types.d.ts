export type AppInfo = Record<string, string[]>;

export type ScriptOptions = {
  limit: number;
  pkgMgr: "npm" | "pnpm" | "yarn";
  sstScript: string;
  prStageFormat: string;
  prStagePattern: string;
};
