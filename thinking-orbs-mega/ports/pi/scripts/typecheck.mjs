import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const piTypes = join(
  process.cwd(),
  "node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts",
);
const tscCli = join(process.cwd(), "node_modules/typescript/bin/tsc");

if (!existsSync(piTypes)) {
  throw new Error(`Pi type definitions were not found at ${piTypes}. Run npm install first.`);
}
if (!existsSync(tscCli)) {
  throw new Error(`TypeScript was not found at ${tscCli}. Run npm install first.`);
}

const configPath = join(process.cwd(), "tsconfig.json");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "thinking-orbs-typecheck-"));
const temporaryConfigPath = join(temporaryDirectory, "tsconfig.json");
const config = {
  extends: configPath,
  compilerOptions: {
    paths: {
      "@earendil-works/pi-coding-agent": [piTypes],
    },
    typeRoots: [join(process.cwd(), "node_modules/@types")],
  },
};

writeFileSync(temporaryConfigPath, `${JSON.stringify(config, null, 2)}\n`);
try {
  execFileSync(process.execPath, [tscCli, "--project", temporaryConfigPath], {
    stdio: "inherit",
  });
} finally {
  rmSync(temporaryDirectory, { recursive: true });
}
