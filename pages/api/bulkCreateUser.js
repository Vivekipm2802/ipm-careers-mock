import { serversupabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userdata } = req.body;

  if (!Array.isArray(userdata) || userdata.length === 0) {
    return res.status(400).json({ message: 'Invalid users data' });
  }

  // Trim spaces from user data
  const cleanedData = userdata.map(user => {
    return Object.fromEntries(
      Object.entries(user).map(([key, value]) =>
        typeof value === 'string' ? [key, value.trim()] : [key, value]
      )
    );
  });

  const responses = [];
  const errors = [];

  try {
    for (const user of cleanedData) {
      const { data, error } = await serversupabase.auth.admin.createUser(user);

      if (error) {
        let errorMessage = error.message;

        // Check for existing email error
        if (error.status === 400 && error.message.includes('User already exists')) {
          errorMessage = `Email ${user.email} already exists.`;
        }

        console.error(`Error creating user: ${user.email} - ${errorMessage}`);
        errors.push({ email: user.email, error: errorMessage });
      } else {
        responses.push(data);
      }
    }

    if (errors.length > 0) {
      return res.status(500).json({ message: 'Some users could not be created', errors });
    }

    res.status(200).json({ message: 'Users created successfully', responses });
  } catch (error) {
    console.error('Internal server error:', error.message);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
