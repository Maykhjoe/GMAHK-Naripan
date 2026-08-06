const fs = require("node:fs");
const { chromium } = require("playwright-core");
const AxeBuilder = require("@axe-core/playwright").default;

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000";
const routes = [
  "/",
  "/tentang",
  "/jadwal-ibadah",
  "/kegiatan",
  "/kegiatan/seminar-kesehatan-keluarga",
  "/berita",
  "/berita/melayani-dengan-hati",
  "/khotbah",
  "/khotbah/iman-yang-bertumbuh",
  "/pelayanan",
  "/pelayanan/sekolah-sabat",
  "/galeri",
  "/live",
  "/kontak",
  "/pengunjung-baru",
  "/permohonan-doa",
  "/kebijakan-privasi",
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/unauthorized",
];

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const pages = [];

  try {
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(500);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const violations = result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
      }));
      pages.push({ route, url: page.url(), violations });
      console.log(`${violations.length === 0 ? "PASS" : "FAIL"} ${route} (${violations.length} violations)`);
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    pageCount: pages.length,
    violationCount: pages.reduce((total, pageResult) => total + pageResult.violations.length, 0),
    pages,
  };
  fs.writeFileSync(".hermes/audits/axe-public.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(`SUMMARY ${report.pageCount} pages, ${report.violationCount} violations`);
  if (report.violationCount > 0) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
