import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/apiAuth";

const supabaseUrl = process.env.PRINT_SUPABASE_URL;
const supabaseServiceKey = process.env.PRINT_SUPABASE_SERVICE_KEY;

function getPrintClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "Unauthorized – admin access required" });
  }

  const client = getPrintClient();
  if (!client) {
    return res.status(500).json({ error: "Print service not configured" });
  }

  const { action } = req.body || req.query;

  try {
    switch (action) {
      case "getRequests": {
        if (req.method !== "GET" && req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { data, error } = await client
          .from("print_requests")
          .select("*,uid(*)")
          .order("created_at", { ascending: false });
        if (error) return res.status(500).json({ error: "Error loading requests" });
        return res.status(200).json({ data });
      }

      case "updateTracking": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { tracking, id } = req.body;
        if (!tracking || !id) {
          return res.status(400).json({ error: "Missing tracking or id" });
        }
        const { data, error } = await client
          .from("print_requests")
          .update({ tracking })
          .eq("id", id)
          .select();
        if (error) return res.status(500).json({ error: "Error updating tracking" });
        return res.status(200).json({ data });
      }

      case "updateSingle": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { ids, status } = req.body;
        if (!ids || !status) {
          return res.status(400).json({ error: "Missing ids or status" });
        }
        const { data, error } = await client
          .from("print_requests")
          .update({ status })
          .in("id", Array.isArray(ids) ? ids : [ids])
          .select();
        if (error) return res.status(500).json({ error: "Error updating request" });
        return res.status(200).json({ data });
      }

      case "updateBulk": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        const { id: bulkId, status: bulkStatus } = req.body;
        if (!bulkId || !bulkStatus) {
          return res.status(400).json({ error: "Missing id or status" });
        }
        const { data, error } = await client
          .from("print_requests")
          .update({ status: bulkStatus })
          .eq("id", bulkId)
          .select();
        if (error) return res.status(500).json({ error: "Error updating request" });
        return res.status(200).json({ data });
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
