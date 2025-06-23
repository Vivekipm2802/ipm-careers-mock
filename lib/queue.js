// lib/queue.js
import { serversupabase } from '@/utils/supabaseClient';
import Queue from 'bull';


const queue = new Queue('class-queue', {
  redis: {
    host: 'localhost', // replace with your Redis host
    port: 6379, // replace with your Redis port
  },
});

queue.process(async (job) => {
  const { id } = job.data;

  // Add your processing logic here
  // For example, update the row with the given id

  // Simulate async processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Update the database after processing
  const { data, error } = await supabase
    .from('classes')
    .update({ url: 'new-url' }) // Replace 'new-url' with your logic
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  return data;
});

export default queue;
