import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const page = parseInt(req.query.page, 10) || 0;
  const pageSize = parseInt(req.query.pageSize, 10) || 50;
  const search = req.query.search || "";

  const from = page * pageSize;
  const to = from + pageSize - 1;

  try {
    let users = [];
    if (search) {
      let allUsers = [];
      let currentPage = 1;
      let totalFetched = 0;
      let keepFetching = true;
      const perPage = 1000;
      while (keepFetching) {
        let { data, error } = await serversupabase.auth.admin.listUsers({
          page: currentPage,
          perPage,
        });
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        const pageUsers = data?.users || [];
        allUsers = allUsers.concat(pageUsers);
        totalFetched += pageUsers.length;
        if (pageUsers.length < perPage) {
          keepFetching = false;
        } else {
          currentPage += 1;
        }
      }
      const searchLower = search.toLowerCase();
      users = allUsers.filter(
        (u) => u.email && u.email.toLowerCase().includes(searchLower)
      );
    } else {
      let { data, error } = await serversupabase.auth.admin.listUsers({
        page: page + 1,
        perPage: pageSize,
      });
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      users = data?.users || [];
      users = users.slice(0, pageSize);
    }

    const emails = users.map((u) => u.email).filter(Boolean);

    return res.status(200).json(emails);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
