import * as fs from "fs";
import * as path from "path";

const FLAGGED = ["Customer", "Customers", "Patient", "Patients", "Client", "Clients",
  "Job", "Jobs", "Appointment", "Appointments", "Opportunity", "Opportunities",
  "Deal", "Deals", "Won", "Lost"];

function scanFile(filePath: string) {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const findings: { line: number; text: string; match: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(\/\/|\/\*|\*|import )/.test(l)) continue;
    // Skip lines where the word only appears as an HTML attribute value (DB identifier, not UI text)
    // e.g. value="Won" or value="Lost" — internal DB status values, display text uses profile labels
    const strippedAttrs = l.replace(/\s(?:value|key|name|id|type|status)=["'][^"']*["']/g, "");
    for (const word of FLAGGED) {
      if (new RegExp(`[>]\\s*${word}\\s*[<{]|"${word}"|'${word}'`).test(strippedAttrs)) {
        findings.push({ line: i + 1, text: l.trim(), match: word });
        break;
      }
    }
  }
  return findings;
}

function walk(dir: string, results: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !["node_modules", ".next", ".git", "scripts"].includes(e.name)) walk(p, results);
    else if (e.isFile() && e.name.endsWith(".tsx")) results.push(p);
  }
  return results;
}

const SKIP_PATHS = [
  "src/app/page.tsx",
  "src/app/preview",
  "src/app/docs",
];

const root = path.join(__dirname, "..");
let total = 0;
for (const file of walk(path.join(root, "src"))) {
  const rel = path.relative(root, file);
  if (file.includes("industry-profiles")) continue;
  if (SKIP_PATHS.some((s) => rel.startsWith(s))) continue;
  const findings = scanFile(file);
  if (findings.length) {
    for (const f of findings) { console.log(`${rel}:${f.line}  ${f.match}  →  ${f.text.slice(0, 80)}`); total++; }
  }
}
console.log(`\n${total} findings`);
