import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const isV2 = String(req.query.v || "") === "2";

  const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
  const requestedPageSize = parseInt(req.query.pageSize, 10) || 50;

  // Keep this endpoint safe: don't let clients request massive pages.
  const MAX_PAGE_SIZE = 200;
  const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);

  const rawSearch = (req.query.search ?? "").toString().trim();

  // For very short search strings, doing a "contains" scan is wasteful and usually not meaningful.
  // Treat it as "no search" and let the client keep typing.
  const search = rawSearch.length >= 2 ? rawSearch : "";

  const respond = (emails, hasMore) => {
    if (isV2) return res.status(200).json({ emails, hasMore });
    return res.status(200).json(emails);
  };

  try {
    // No search: use direct pagination from Supabase Auth.
    if (!search) {
      const { data, error } = await serversupabase.auth.admin.listUsers({
        page: page + 1, // Supabase pages are 1-based
        perPage: pageSize + 1, // request one extra row to detect "hasMore"
      });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const users = data?.users || [];
      const hasMore = users.length > pageSize;

      const emails = users
        .slice(0, pageSize)
        .map((u) => u.email)
        .filter(Boolean);

      return respond(emails, hasMore);
    }

    // Search: Supabase Auth admin API doesn't support server-side "contains email" filtering.
    // We still optimize by scanning pages until we have enough matches for the requested page,
    // instead of fetching the entire user base at once.
    const searchLower = search.toLowerCase();
    const matchFrom = page * pageSize;

    const AUTH_PER_PAGE = 1000;
    const MAX_AUTH_PAGES_TO_SCAN = 100;

    let currentAuthPage = 1;
    let seenMatches = 0;
    let collected = [];
    let exhausted = false;

    while (
      collected.length < pageSize + 1 &&
      currentAuthPage <= MAX_AUTH_PAGES_TO_SCAN
    ) {
      const { data, error } = await serversupabase.auth.admin.listUsers({
        page: currentAuthPage,
        perPage: AUTH_PER_PAGE,
      });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const pageUsers = data?.users || [];
      if (pageUsers.length === 0) {
        exhausted = true;
        break;
      }

      for (const u of pageUsers) {
        const email = u?.email;
        if (!email) continue;

        if (email.toLowerCase().includes(searchLower)) {
          if (seenMatches >= matchFrom) collected.push(email);
          seenMatches += 1;

          if (collected.length >= pageSize + 1) break;
        }
      }

      if (pageUsers.length < AUTH_PER_PAGE) {
        exhausted = true;
        break;
      }

      currentAuthPage += 1;
    }

    const hasMore =
      collected.length > pageSize && !exhausted
        ? true
        : collected.length > pageSize;

    return respond(collected.slice(0, pageSize), hasMore);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
