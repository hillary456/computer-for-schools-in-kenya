import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import supabase from '../db/supabase.js';
const router = Router();
const TABLE_NAME = 'donations';
router.post('/', async (req, res) => {
    const user_id = req.user?.id || null;
    const data = req.body;
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
        const newDonation = {
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
        const { data: insertedData, error } = await supabase
            .from(TABLE_NAME)
            .insert([newDonation])
            .select('id')
            .single();
        if (error || !insertedData) {
            console.error('Donation submission error:', error);
            res.status(500).json({ success: false, message: 'Unable to submit donation.' });
            return;
        }
        res.status(201).json({
            success: true,
            message: 'Donation submitted successfully. We will contact you within 24 hours.',
            donation_id: insertedData.id,
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.get('/all', requireAdmin, async (req, res) => {
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
            user_name: d.users ? d.users.name : null,
            users: undefined,
        }));
        res.status(200).json({ success: true, donations: resultDonations });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.get('/stats', requireAdmin, async (req, res) => {
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.get('/', requireAuth, async (req, res) => {
    try {
        const user_id = req.user.id;
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.put('/', requireAdmin, async (req, res) => {
    const { id: donation_id, status } = req.body;
    if (!donation_id || !status) {
        res.status(400).json({ success: false, message: 'Donation ID and status are required.' });
        return;
    }
    const valid_statuses = ['pending', 'approved', 'collected', 'processing', 'delivered', 'rejected'];
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
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
export default router;
