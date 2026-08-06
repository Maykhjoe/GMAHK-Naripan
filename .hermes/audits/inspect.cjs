const fs = require("node:fs");
const report = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const id of process.argv.slice(3)) {
  const audit = report.audits[id];
  if (!audit) continue;
  console.log(`\n## ${id}: ${audit.title}`);
  for (const item of audit.details?.items ?? []) {
    const node = item.node ?? item;
    console.log(JSON.stringify({
      selector: node.selector,
      snippet: node.snippet,
      nodeLabel: node.nodeLabel,
      failureSummary: node.explanation ?? node.failureSummary ?? item.failureSummary,
      wastedMs: item.wastedMs,
      wastedBytes: item.wastedBytes,
    }, null, 2));
  }
}
