import { CtoLocal } from "@/utils/DateUtil";
import { serversupabase } from "@/utils/supabaseClient";

export default async (req, res) => {


   
    return res.status(200);
    
    try {
      const { data, error } = await serversupabase
        .from('classes')
        .select(req.body.query)
        .is('url', null);
  
      if (error) {
        throw new Error(error.message);
      }


  
      const dataToSend = data?.map(item => {
        const localDay = CtoLocal(item?.start_time).day;
        const schedule = item.batch_id.batch_schedule.find(s => s.day == localDay);
        
        return {
          host_id: schedule?.host || item.batch_id?.host_id,
          day:localDay,
          
          
        };
      });
      return res.status(200).json({ dataToSend });  // Send success response
    } catch (error) {
      console.error(error);  // Log the error for debugging
      return res.status(500).json({ error: error.message });  // Send error response
    }
  };
  