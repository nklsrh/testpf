// Checks and deploys the CloudScript in this repo. Every top-level .js file is one CloudScript file.
//
//   node tools/cloudscript.mjs check    each file parses; no function or var is defined in two files
//   node tools/cloudscript.mjs deploy   uploads every file as a new revision and makes it live
//
// Deploy reads PLAYFAB_TITLE_ID and PLAYFAB_SECRET_KEY from the environment (a GitHub Actions secret).
// PlayFab loads all files into one global scope, so a name defined twice silently replaces the other.

import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = readdirSync(".").filter((f) => f.endsWith(".js")).sort();

function check() {
  const owners = new Map();
  const problems = [];
  for (const file of files) {
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch (e) {
      problems.push(`${file} does not parse:\n${e.stderr}`);
    }
    const source = readFileSync(file, "utf8");
    const names = [
      ...source.matchAll(/^function\s+(\w+)/gm),
      ...source.matchAll(/^var\s+(\w+)/gm),
      ...source.matchAll(/^handlers\.(\w+)\s*=/gm),
    ].map((m) => (m[0].startsWith("handlers") ? `handlers.${m[1]}` : m[1]));
    for (const name of names) {
      const first = owners.get(name);
      if (first && first !== file) problems.push(`${name} is defined in both ${first} and ${file}`);
      owners.set(name, first ?? file);
    }
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const handlers = [...owners.keys()].filter((n) => n.startsWith("handlers.")).sort();
  console.log(`${files.length} files OK, ${handlers.length} handlers: ${handlers.join(", ")}`);
}

async function deploy() {
  const titleId = process.env.PLAYFAB_TITLE_ID;
  const secret = process.env.PLAYFAB_SECRET_KEY;
  if (!titleId || !secret) throw new Error("PLAYFAB_TITLE_ID and PLAYFAB_SECRET_KEY must be set");

  const response = await fetch(`https://${titleId}.playfabapi.com/Admin/UpdateCloudScript`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-SecretKey": secret },
    body: JSON.stringify({
      Files: files.map((f) => ({ Filename: f, FileContents: readFileSync(f, "utf8") })),
      Publish: true,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.code !== 200) {
    throw new Error(`PlayFab rejected the upload (${response.status}): ${body.errorMessage ?? JSON.stringify(body)}`);
  }
  console.log(`Deployed ${files.length} files as live revision ${body.data.Revision}`);
}

const command = process.argv[2];
if (command === "check") check();
else if (command === "deploy") await deploy();
else {
  console.error("usage: node tools/cloudscript.mjs check|deploy");
  process.exit(2);
}
