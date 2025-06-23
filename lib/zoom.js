// lib/zoom.js
import axios from 'axios';


async function generateZoomMeeting(bearer,startTime,participants,className) {
  try {
    


const st = new Date(startTime).toISOString().split('.')[0] + 'Z';

console.log(st)
    const response = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic: className,
        type: 2, // Scheduled meeting
        start_time: st,
        timezone: 'Asia/Kolkata', // Adjust based on your requirement
        settings: {
          approval_type: 0, // Automatically approve participants
          registration_type: 1, // Register individual participants
        },
        attendees: participants,
      },
      {
        headers: {
          'Authorization': `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data) {
      return response.data.join_url;
    }

    throw new Error('Failed to create Zoom meeting');
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.data);
    throw error;
  }
}

export default generateZoomMeeting;
