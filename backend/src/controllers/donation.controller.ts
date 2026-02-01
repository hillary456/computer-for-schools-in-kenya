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
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('donations')
      .select('*, users(name, email, user_type)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
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

// backend/src/controllers/donation.controller.ts

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

    // 1. Fetch the current donation details first
    const { data: donation, error: fetchError } = await supabaseAdmin
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .single();

    if (fetchError || !donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    // 2. LOGIC: If status changes to 'processing', create inventory items automatically
    // This loop creates one inventory row for every computer in the donation quantity
    if (status === 'processing' && donation.status !== 'processing') {
      const inventoryItems = Array.from({ length: donation.quantity }).map(() => ({
        donation_id: donationId,
        // Default mixed to desktop if unspecified, or keep as mixed
        computer_type: donation.computer_type === 'mixed' ? 'desktop' : donation.computer_type, 
        status: 'received', // Initial status in inventory
        condition_received: donation.condition_status === 'mixed' ? 'needs-repair' : donation.condition_status,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const { error: inventoryError } = await supabaseAdmin
        .from('computer_inventory')
        .insert(inventoryItems);

      if (inventoryError) {
        console.error('Inventory creation failed:', inventoryError);
        // We continue to update status, or you could return error here
      }
    }

    // 3. Update the donation status
    const { data, error } = await supabaseAdmin
      .from('donations')
      .update({ status })
      .eq('id', donationId)
      .select();

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    res.json({
      message: `Donation status updated to ${status}. Inventory updated.`,
      donation: data[0]
    });
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};