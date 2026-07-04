/**
 * Combines the modular rule files in firestore/ (sorted by filename)
 * into the single firestore.rules file Firebase deploys.
 *
 * Edit the files in firestore/, never firestore.rules directly.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_DIR = "firestore";
const OUTPUT = "firestore.rules";

const files = readdirSync(SOURCE_DIR)
  .filter((name) => name.endsWith(".rules"))
  .sort();

if (files.length === 0) {
  console.error(`No .rules files found in ${SOURCE_DIR}/`);
  process.exit(1);
}

const sections = files.map((name) => {
  const body = readFileSync(join(SOURCE_DIR, name), "utf8").trimEnd();
  return `    // ===== ${name} =====\n\n${body}`;
});

const output = [
  "// GENERATED FILE - DO NOT EDIT DIRECTLY.",
  `// Built from ${SOURCE_DIR}/*.rules - rebuild with: npm run build:rules`,
  "",
  "rules_version = '2';",
  "",
  "service cloud.firestore {",
  "  match /databases/{database}/documents {",
  "",
  sections.join("\n\n"),
  "",
  "  }",
  "}",
  "",
].join("\n");

writeFileSync(OUTPUT, output);

console.log(`${OUTPUT} built from ${files.length} source files:`);
for (const name of files) {
  console.log(`  ${name}`);
}
