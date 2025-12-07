import { Router, Response } from 'express';
import { AuthRequest, ContactStatus } from '../types.js';
import { requireAdmin } from '../middleware/auth.js';
import supabase from '../db/supabase.js';

const router = Router();
const TABLE_NAME = 'contact_messages';
 
router.post('/', async (req: AuthRequest, res: Response) => {
  const data = req.body;

  const required_fields = ['name', 'email', 'message']; 
  const missing_fields = required_fields.filter(field => !data[field]);

  if (missing_fields.length > 0) {
    return res.status(400).json({ success: false, message: 'Missing required fields.', missing_fields });
  }

  if (!data.email.includes('@') || !data.email.includes('.')) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }

  try {
    const newMessage = {
      name: data.name,
      email: data.email,
      subject: data.subject || 'General Inquiry',
      message: data.message,
      status: 'unread',
    };

    const { data: insertedData, error } = await supabase
      .from(TABLE_NAME)
      .insert([newMessage])
      .select('id')
      .single();

    if (error || !insertedData) {
      console.error('Contact message submission error:', error);
      return res.status(503).json({ success: false, message: 'Database error. Unable to send message.' });
    } 

    return res.status(200).json({
      success: true,
      message: 'Thank you for your message! We will get back to you within 24 hours.',
      message_id: insertedData.id
    });

  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});
 
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data: messages, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch contact messages error:', error);
      return res.status(500).json({ success: false, message: 'Unable to fetch messages.' });
    }

    return res.status(200).json({ success: true, messages });

  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});
 
router.put('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { id: message_id, status } = req.body;
  
  if (!message_id || !status) {
      return res.status(400).json({ success: false, message: 'Message ID and status are required.' });
  }

  const valid_statuses: ContactStatus[] = ['unread', 'read', 'replied'];
  if (!valid_statuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ status })
      .eq('id', message_id);

    if (error) {
      console.error('Update contact status error:', error);
      return res.status(500).json({ success: false, message: 'Unable to update message status.' });
    }

    return res.status(200).json({ success: true, message: 'Message status updated successfully.' });

  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});

export default router;