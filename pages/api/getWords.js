// pages/api/fetchWords.js
import { serversupabase } from '@/utils/supabaseClient'

export default async function handler(req, res) {
  try {
    const { method, body } = req;

    switch (method) {
      case 'GET': {
        const { data, error } = await serversupabase
          .from('word_of_the_day')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ words: data || [] });
      }

      case 'POST': { // Create Word
        const { word, meaning, date } = body;
        const { data, error } = await serversupabase
          .from('word_of_the_day')
          .insert([{ word, meaning, date }])
          .select();

        if (error) throw error;

        return res.status(201).json({ message: 'Word created successfully', word: data[0] });
      }

      case 'PUT': { // Update Word
        const { id, word, meaning } = body;
        const { data, error } = await serversupabase
          .from('word_of_the_day')
          .update({ word, meaning })
          .eq('id', id)
          .select();

        if (error) throw error;

        return res.status(200).json({ message: 'Word updated successfully', word: data[0] });
      }

      case 'DELETE': { // Delete Word
        const { id } = body;
        const { error } = await serversupabase
          .from('word_of_the_day')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Word deleted successfully' });
      }

      default:
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
