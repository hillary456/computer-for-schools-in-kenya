import { Router, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase.js'; 
import { AuthRequest, Donation, DonationStatus } from '../types.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const TABLE_NAME = 'donations';

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const data = req.body;
  let user_id = null;
 
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
          user_id = userData.user.id;
      }
  }
 
  const required_fields = ['donor_name', 'email', 'phone', 'address', 'computer_type', 'quantity', 'condition_status'];
  const missing_fields = required_fields.filter(field => !data[field]);

  if (missing_fields.length > 0) {
    res.status(400).json({ success: false, message: 'Missing required fields.', missing_fields });
    return;
  }

  if (!data.email.includes('@') || !data.email.includes('.')) {
    res.status(400).json({ success: false, message: 'Invalid email format.' });
    return;
  }

  try {
    const newDonation: Partial<Donation> = {
      user_id,
      donor_name: data.donor_name,
      organization: data.organization || null,
      email: data.email,
      phone: data.phone,
      address: data.address,
      computer_type: data.computer_type,
      quantity: parseInt(data.quantity),
      condition_status: data.condition_status,
      pickup_date: data.pickup_date || null,
      message: data.message || null,
      status: 'pending',
    };
 
    const client = supabaseAdmin || supabase;
    
    const { data: insertedData, error } = await client
      .from(TABLE_NAME)
      .insert([newDonation])
      .select('id')
      .single();

    if (error || !insertedData) {
      console.error('Donation submission error:', error);
      res.status(500).json({ success: false, message: 'Unable to submit donation.', details: error });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Donation submitted successfully. We will contact you within 24 hours.',
      donation_id: insertedData.id,
    });

  } catch (e: any) {
    res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});
 

router.get('/all', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: donations, error } = await supabase
      .from(TABLE_NAME)
      .select(`*, users (name)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch all donations error:', error);
      res.status(500).json({ success: false, message: 'Unable to fetch donations.' });
      return;
    }

    const resultDonations = donations.map(d => ({
        ...d,
        user_name: d.users ? (d.users as { name: string }).name : null,
        users: undefined,
    }));

    res.status(200).json({ success: true, donations: resultDonations });

  } catch (e: any) {
    res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});

router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { count: totalCount, error: totalError } = await supabase
            .from(TABLE_NAME).select('*', { count: 'exact', head: true });
            
        const { data: allDonations } = await supabase
            .from(TABLE_NAME).select('quantity');
        
        const sumQuantities = allDonations?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;

        const { count: deliveredCount } = await supabase
            .from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('status', 'delivered');
            
        const { count: pendingCount } = await supabase
            .from(TABLE_NAME).select('*', { count: 'exact', head: true }).eq('status', 'pending');

        if (totalError) {
            res.status(500).json({ success: false, message: 'Unable to fetch donation statistics.' });
            return;
        }
        
        const stats = {
            total_donations: totalCount || 0,
            total_computers: sumQuantities,
            delivered_donations: deliveredCount || 0,
            pending_donations: pendingCount || 0,
        };
        
        res.status(200).json({ success: true, stats });

    } catch (e: any) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user!.id;
    const { data: donations, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch user donations error:', error);
      res.status(500).json({ success: false, message: 'Unable to fetch user donations.' });
      return;
    }

    res.status(200).json({ success: true, donations });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});

router.put('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id: donation_id, status } = req.body;
  
  if (!donation_id || !status) {
      res.status(400).json({ success: false, message: 'Donation ID and status are required.' });
      return;
  }

  const valid_statuses: DonationStatus[] = ['pending', 'approved', 'collected', 'processing', 'delivered', 'rejected'];
  if (!valid_statuses.includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status.' });
    return;
  }

  try {
    const { error, count } = await supabase
      .from(TABLE_NAME)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', donation_id)
      .select();

    if (error) {
      console.error('Update donation status error:', error);
      res.status(500).json({ success: false, message: 'Unable to update donation status.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Donation status updated successfully.' });

  } catch (e: any) {
    res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});

export default router;