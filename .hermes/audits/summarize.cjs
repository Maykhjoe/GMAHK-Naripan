const fs = require("node:fs");
const path = require("node:path");

for (const filename of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(path.resolve(filename), "utf8"));
  const categories = Object.fromEntries(
    Object.entries(report.categories).map(([name, category]) => [name, Math.round(category.score * 100)]),
  );
  const metrics = Object.fromEntries(
    ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift"]
      .map((id) => [id, report.audits[id]?.displayValue ?? null]),
  );
  const failures = Object.values(report.audits)
    .filter((audit) => audit.score !== null && audit.score < 0.9 && ["binary", "numeric"].includes(audit.scoreDisplayMode))
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)
    .map((audit) => ({ id: audit.id, score: Math.round(audit.score * 100), title: audit.title, display: audit.displayValue ?? "", items: audit.details?.items?.length ?? 0 }));
  console.log(JSON.stringify({ filename, categories, metrics, failures }, null, 2));
}
