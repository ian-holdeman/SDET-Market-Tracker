/** Validate reporter output before any telemetry write. No fabricated fallback runs. */
export function summarizeReport(report: any) {
  const invalid = () => { throw new Error('Invalid or empty Playwright report; telemetry was not created.'); };
  const integer = (n: unknown) => Number.isInteger(n) && Number(n) >= 0;
  if (!report || !Array.isArray(report.suites) || !report.stats) invalid();
  const stats = report.stats;
  for (const key of ['expected', 'unexpected', 'flaky', 'skipped']) {
    if (!integer(stats[key])) invalid();
  }
  if (!Number.isFinite(stats.duration) || stats.duration < 0 ||
      typeof stats.startTime !== 'string' || !Number.isFinite(Date.parse(stats.startTime))) invalid();
  if (report.errors !== undefined && !Array.isArray(report.errors)) invalid();

  const counts = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  const suites: Array<{ title: string; file: string; tests: Array<{
    name: string; status: string; durationMs: number; error?: string;
  }> }> = [];
  function visit(nodes: any[], parentFile = '') {
    for (const suite of nodes) {
      if (!suite || typeof suite.title !== 'string') invalid();
      const file = suite.file ?? parentFile;
      if (typeof file !== 'string') invalid();
      if (suite.specs !== undefined) {
        if (!Array.isArray(suite.specs)) invalid();
        const tests = [];
        for (const spec of suite.specs) {
          if (typeof spec.title !== 'string' || !Array.isArray(spec.tests) || !spec.tests.length) invalid();
          for (const test of spec.tests) {
            if (!test || !Object.hasOwn(counts, test.status) || !Array.isArray(test.results)) invalid();
            counts[test.status as keyof typeof counts]++;
            if (!test.results.length && test.status !== 'skipped') invalid();
            for (const result of test.results) {
              if (!result || !['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(result.status) ||
                  !Number.isFinite(result.duration) || result.duration < 0) invalid();
            }
            const last = test.results.at(-1);
            if (test.status === 'expected' && (!last || ['interrupted', 'skipped'].includes(last.status) ||
                last.status !== (test.expectedStatus || 'passed'))) invalid();
            const error = last?.error?.message || test.results.find((r: any) => r.error?.message)?.error.message;
            tests.push({
              name: `${spec.title}${test.projectName ? ` [${test.projectName}]` : ''}`,
              status: test.status === 'expected' ? 'passed' : test.status === 'unexpected' ? (last?.status === 'timedOut' ? 'timedOut' : 'failed') : test.status,
              durationMs: Math.round(test.results.reduce((sum: number, r: any) => sum + r.duration, 0)),
              ...(typeof error === 'string' ? { error } : {}),
            });
          }
        }
        if (tests.length) suites.push({ title: suite.title, file: file.replace(/\\/g, '/'), tests });
      }
      if (suite.suites !== undefined) {
        if (!Array.isArray(suite.suites)) invalid();
        visit(suite.suites, file);
      }
    }
  }
  visit(report.suites);
  for (const key of Object.keys(counts) as Array<keyof typeof counts>) {
    if (counts[key] !== stats[key]) invalid();
  }
  const totalTests = counts.expected + counts.unexpected + counts.flaky + counts.skipped;
  if (!totalTests || totalTests === counts.skipped) invalid();
  const hasErrors = !!report.errors?.length;
  return {
    timestamp: stats.startTime,
    status: counts.unexpected || hasErrors ? 'failed' : counts.flaky ? 'flaky' : 'passed',
    totalTests, passed: counts.expected, failed: counts.unexpected, flaky: counts.flaky,
    skipped: counts.skipped, durationMs: Math.round(stats.duration),
    passRate: Number((counts.expected / totalTests * 100).toFixed(1)),
    suites,
    errors: (report.errors || []).map((error: any) => String(error?.message || 'Playwright run error')),
  };
}
