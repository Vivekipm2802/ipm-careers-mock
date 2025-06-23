import { serversupabase } from '@/utils/supabaseClient';




export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { level_id } = req.body;
    
    if (!level_id) {
        return res.status(400).json({ error: 'Missing level_id' });
    }

    const { data, error } = await serversupabase
        .from('levels')
        .select('*, questions!questions_parent_fkey(*)')
        .eq('id', level_id)
        .order('seq', { foreignTable: 'questions', ascending: true });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Not found' });
    }

    const parent = { ...data[0] };
    delete parent["questions"];

    return res.status(200).json({ questions: data[0]?.questions || [], parent });
}
