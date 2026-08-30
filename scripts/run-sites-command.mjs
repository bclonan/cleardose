import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = resolve(process.env.SITES_RUNTIME_ROOT || resolve(projectRoot, ".sites-runtime"));
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("usage: node scripts/run-sites-command.mjs command [args...]");
  process.exit(64);
}

for (const directory of ["npm-cache"]) {
  mkdirSync(resolve(runtimeRoot, directory), { recursive: true });
}

const env = {
  ...process.env,
  SITES_ENV_READY: "1",
  SITES_PROJECT_ROOT: projectRoot,
  npm_config_cache: resolve(runtimeRoot, "npm-cache"),
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_update_notifier: "false",
};

for (const name of [
  "NPM_CONFIG_CACHE",
  "npm_config_proxy",
  "npm_config_http_proxy",
  "npm_config_https_proxy",
  "NPM_CONFIG_PROXY",
  "NPM_CONFIG_HTTP_PROXY",
  "NPM_CONFIG_HTTPS_PROXY",
]) {
  delete env[name];
}

const result = spawnSync(command, args, {
  cwd: projectRoot,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
