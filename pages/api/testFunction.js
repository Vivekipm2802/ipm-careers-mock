import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase } from "@/utils/supabaseClient";

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const query = req.body?.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing or invalid query parameter' });
    }

    const { data, error } = await serversupabase
      .from('classes')
      .select(query)
      .is('url', null);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const dataToSend = data?.map(item => {
      const localDay = CtoLocal(item?.start_time)?.day;
      const schedule = item?.batch_id?.batch_schedule?.find(s => s.day == localDay);

      return {
        host_id: schedule?.host || item?.batch_id?.host_id,
        day: localDay,
      };
    }) || [];

    return res.status(200).json({ success: true, dataToSend });
  } catch (error) {
    console.error('Error in testFunction:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
