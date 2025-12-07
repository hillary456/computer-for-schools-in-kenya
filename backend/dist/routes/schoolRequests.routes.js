import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import supabase from '../db/supabase.js';
const router = Router();
const TABLE_NAME = 'school_requests';
router.post('/', requireAuth, async (req, res) => {
    const user_id = req.user.id;
    const data = req.body;
    const required_fields = ['school_name', 'contact_person', 'email', 'phone', 'location', 'computer_type', 'quantity', 'justification'];
    const missing_fields = required_fields.filter(field => !data[field]);
    if (missing_fields.length > 0) {
        res.status(400).json({ success: false, message: 'All required fields must be filled.', missing_fields });
        return;
    }
    if (!data.email.includes('@') || !data.email.includes('.')) {
        res.status(400).json({ success: false, message: 'Invalid email format.' });
        return;
    }
    try {
        const newRequest = {
            user_id,
            school_name: data.school_name,
            contact_person: data.contact_person,
            email: data.email,
            phone: data.phone,
            location: data.location,
            computer_type: data.computer_type,
            quantity: data.quantity,
            justification: data.justification,
            status: 'pending',
        };
        const { data: insertedData, error } = await supabase
            .from(TABLE_NAME)
            .insert([newRequest])
            .select('id')
            .single();
        if (error || !insertedData) {
            console.error('School request submission error:', error);
            res.status(500).json({ success: false, message: 'Unable to submit school request.' });
            return;
        }
        res.status(201).json({
            success: true,
            message: 'School request submitted successfully. We will review your application and get back to you.',
            request_id: insertedData.id,
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.get('/', requireAuth, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { data: requests, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Fetch user requests error:', error);
            res.status(500).json({ success: false, message: 'Unable to fetch user requests.' });
            return;
        }
        res.status(200).json({ success: true, requests });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.get('/all', requireAdmin, async (req, res) => {
    try {
        const { data: requests, error } = await supabase
            .from(TABLE_NAME)
            .select(`*, users (name)`)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Fetch all requests error:', error);
            res.status(500).json({ success: false, message: 'Unable to fetch requests.' });
            return;
        }
        const resultRequests = requests.map(r => ({
            ...r,
            user_name: r.users ? r.users.name : null,
            users: undefined,
        }));
        res.status(200).json({ success: true, requests: resultRequests });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const { count: totalCount, error: totalError } = await supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact', head: true });
        const { data: allRequests } = await supabase
            .from(TABLE_NAME).select('quantity');
        const sumQuantities = allRequests?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;
        const { count: approvedCount } = await supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved');
        const { count: pendingCount } = await supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        if (totalError) {
            console.error('Request stats error:', totalError);
            res.status(500).json({ success: false, message: 'Unable to fetch request statistics.' });
            return;
        }
        const stats = {
            total_requests: totalCount || 0,
            total_computers_requested: sumQuantities,
            approved_requests: approvedCount || 0,
            pending_requests: pendingCount || 0,
        };
        res.status(200).json({ success: true, stats });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
router.put('/', requireAdmin, async (req, res) => {
    const { id: request_id, status } = req.body;
    if (!request_id || !status) {
        res.status(400).json({ success: false, message: 'Request ID and status are required.' });
        return;
    }
    const valid_statuses = ['pending', 'approved', 'fulfilled', 'rejected'];
    if (!valid_statuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status.' });
        return;
    }
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', request_id);
        if (error) {
            console.error('Update request status error:', error);
            res.status(500).json({ success: false, message: 'Unable to update request status.' });
            return;
        }
        res.status(200).json({ success: true, message: 'Request status updated successfully.' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
export default router;
