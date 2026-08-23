// ============================================================
// lib/featuredMock.js — featured-mock priority for live banners.
//
// Rule (2026-08, owner call): among mocks that are LIVE right now,
// one flagged config.featured === true wins the banner over the
// default ends-soonest sort. If several are featured, the soonest-
// ending featured mock wins. With no featured mock the behaviour
// is exactly the old one: soonest-ending live mock.
//
// Upcoming-mock selection is deliberately NOT touched — featured
// only matters once the window is actually open.
//
// Shared by components/Dashboard.js and components/MockTests.js,
// unit-tested in scripts/ssr-check.js. Plain CJS-compatible ESM
// (no React) so the test scripts can require it directly.
// ============================================================

/**
 * Pick the live mock to show in a banner.
 *
 * @param {Array} live      live candidates, each with an `endsAt`
 *                          Date (already filtered to open-now).
 * @param {Function} [getConfig] optional accessor returning the
 *                          mock's config object for an item —
 *                          defaults to `item.config` (Dashboard
 *                          shape); MockTests passes
 *                          `(x) => x.test?.config`.
 * @returns the winning item, or null when the list is empty.
 */
export function pickLiveMock(live, getConfig) {
  if (!Array.isArray(live) || live.length === 0) return null;
  const cfg = getConfig || ((item) => item && item.config);
  const byEnd = [...live].sort((a, b) => a.endsAt - b.endsAt);
  const featured = byEnd.filter((item) => cfg(item)?.featured === true);
  return featured[0] || byEnd[0];
}

/** True when an item's config carries the featured flag. */
export function isFeatured(config) {
  return config?.featured === true;
}
