const { getAuthUser } = require('@/lib/apiAuth');
const { createClient } = require('@supabase/supabase-js');

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { test_id, report, data: miscData } = req.body;

  if (!test_id) {
    return res.status(400).json({ error: 'Missing test_id' });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Try full insert with all columns
    let result = await supabase
      .from('mock_plays')
      .insert({
        test_id: test_id,
        status: 'completed',
        report: report || [],
        data: miscData || [],
        user: user.email,
        name: user.user_metadata?.full_name || user.email,
      })
      .select();

    // If full insert fails (likely missing columns), retry with minimum columns
    if (result.error) {
      result = await supabase
        .from('mock_plays')
        .insert({
          test_id: test_id,
          status: 'completed',
          report: report || [],
          user: user.email,
        })
        .select();
    }

    // If still failing, try absolute minimum
    if (result.error) {
      result = await supabase
        .from('mock_plays')
        .insert({
          test_id: test_id,
          status: 'completed',
          report: report || [],
        })
        .select();
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message, details: result.error });
    }

    if (result.data && result.data.length > 0) {
      return res.status(200).json({ data: result.data[0] });
    }

    return res.status(500).json({ error: 'Insert returned no data' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
