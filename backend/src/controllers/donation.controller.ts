import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { supabase, supabaseAdmin } from '../config/supabase.js';

export const createDonation = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const donationData = {
      ...req.body,
      user_id: req.body.user_id || null,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('donations')
      .insert(donationData)
      .select()
      .single();

    if (error) {
      console.error('Donation creation error:', error);
      res.status(500).json({ message: 'Failed to create donation' });
      return;
    }

    res.status(201).json({
      message: 'Donation submitted successfully',
      donation: data
    });
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Support filtering by 'condition' (working, needs-repair, mixed, etc.)
    const { status, condition, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Use supabaseAdmin to bypass RLS and see all records
    let query = supabaseAdmin
      .from('donations')
      .select('*, users(name, email, user_type)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    // NEW: Filter logic for the frontend dropdown
    if (condition) {
      query = query.eq('condition_status', condition);
    }

    const { data, error, count } = await query;

    if (error) {
      res.status(500).json({ message: 'Failed to fetch donations' });
      return;
    }

    res.json({
      donations: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDonationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('donations')
      .select('*, users(name, email, user_type)')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    if (req.user?.user_type !== 'admin' && data.user_id !== req.user?.id) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ donation: data });
  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (req.user?.user_type !== 'admin' && req.user?.id !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ message: 'Failed to fetch user donations' });
      return;
    }

    res.json({ donations: data });
  } catch (error) {
    console.error('Get user donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateDonationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;
    const donationId = parseInt(id, 10);

    // 1. Fetch current donation details
    const { data: donation, error: fetchError } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .single();

    if (fetchError || !donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    // 2. AUTOMATION LOGIC: Create inventory items
    // Trigger if status matches 'processing' OR 'collected'
    const validInventoryStatuses = ['processing', 'collected'];

    // Check if inventory already exists to prevent duplicates (Retry Logic)
    const { count: inventoryCount } = await supabaseAdmin
      .from('computer_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('donation_id', donationId);

    // If entering a valid status AND no inventory exists yet -> Create it
    if (validInventoryStatuses.includes(status) && (inventoryCount === 0)) {
      
      const inventoryItems = Array.from({ length: donation.quantity }).map(() => ({
        donation_id: donationId,
        // FIX: If mixed, default to 'desktop'. Admin fixes this in Refurbish step.
        computer_type: donation.computer_type === 'mixed' ? 'desktop' : donation.computer_type,
        
        // Initial status is always 'received' so it shows in the first tab
        status: 'received', 
        
        // FIX: If mixed, default to 'needs-repair'. Admin checks actual condition.
        condition_received: donation.condition_status === 'mixed' ? 'needs-repair' : donation.condition_status,
        
        // Generate a temporary serial number
        serial_number: `PENDING-${donationId}-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const { error: invError } = await supabaseAdmin
        .from('computer_inventory')
        .insert(inventoryItems);

      if (invError) console.error('Inventory Error:', invError);
    }

    // 3. Update the donation status
    const { data, error } = await supabaseAdmin
      .from('donations')
      .update({ status })
      .eq('id', donationId)
      .select();

    if (error) throw error;

    res.json({ message: 'Status updated and inventory generated', donation: data[0] });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
}; 