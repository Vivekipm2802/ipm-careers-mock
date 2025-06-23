// pages/api/triggerQueue.js
import generateZoomMeeting from '@/lib/zoom';
import { CtoLocal } from '@/utils/DateUtil';
import { serversupabase } from '@/utils/supabaseClient';
import axios from 'axios';
import qs from 'querystring'


export default async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Only GET requests are allowed' });
    return;
  }

  try {
    const { data, error } = await serversupabase
      .from('classes')
      .select('*,batch_id(centre,id,host_id,title,batch_schedule(*))')
      .is('url', null);


     

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data) {
        try {
          // Process each row
          await processRow(row);
        } catch (error) {
          // Handle the error (e.g., log it) and continue to the next row
          console.error(`Error processing row: ${row.id}`, error);
        }
      }

    res.status(200).json({ message: 'All rows processed' });
  } catch (error) {
    console.error('Error processing rows:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

async function processRow(row) {
    try {
     

    
     
      
        const localDay = CtoLocal(row?.start_time).day;
        const schedule = row?.batch_id?.batch_schedule.find(s => s.day == localDay);
        const selectedHost = schedule?.host || row?.batch_id?.host_id;
        
       
      

       
     
      const { data: credentials, error } = await serversupabase
        .from('zoom').select('*').eq('role_id',selectedHost).single();
  
        
      if (error) {
        return
      }
  
      if (!credentials) {
        return
      }
      
     
      const { account_id, key, secret } = credentials;
      
       
      if (!account_id || !key || !secret) {
        console.log('Unable to destructure credentials: Missing required fields')
        throw new Error("Unable to destructure credentials: Missing required fields");
      }
  
      // Extract participants and start_time from row
      const { data: participantsData, error: participantsError } = await serversupabase
      .from('batch_admits')
      .select('student_id') // Assuming participant_email is the column name
      .eq('batch_id', row.batch_id.id);

      
    if (participantsError) {
      console.log(row.title+ ': '+participantsError.message)
      throw new Error(participantsError.message);
    }
      const startTime = schedule?.time ?? row.start_time; // Assuming start_time is in a compatible format
  
      
      const participants = participantsData.map(item=>item.student_id)
      const basic = Buffer.from(`${key}:${secret}`).toString('base64');
      const bearer = await getToken(account_id,basic);
      const className = `${row?.batch_id?.title} | ${CtoLocal(row?.start_time).dayName} | ${CtoLocal(row?.start_time).monthName} | ${CtoLocal(row?.start_time).year}`


      
      
      const meeting_url = await generateZoomMeeting(bearer, startTime, participants,className);
  
      
      
      // Update the database after processing
      const { data, error: updateError } = await serversupabase
        .from('classes')
        .update({ url: meeting_url })
        .eq('id', row.id);
  
      if (updateError) {
        throw new Error(updateError.message);
      }
  
      return data;
    } catch (error) {
      console.error('Error processing row:', error);
      throw error;
    }
  }



  

async function getToken(a,b) {
    try {
        const response = await axios.post('https://zoom.us/oauth/token', qs.stringify({
            grant_type: 'account_credentials',
            account_id: a
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${b}`
            }
        });

        const accessToken = response.data.access_token;
        
        return accessToken;
    } catch (error) {
        console.error('Error fetching access token:', error.response ? error.response.data : error.message);
        throw error;
    }
}
