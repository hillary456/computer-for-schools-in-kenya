import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
    const { status, collection_date } = req.body; // NEW: Capture collection_date
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

    // 2. AUTOMATION LOGIC: Create inventory items (Existing Logic)
    const validInventoryStatuses = ['processing', 'collected'];
    const { count: inventoryCount } = await supabaseAdmin
      .from('computer_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('donation_id', donationId);

    if (validInventoryStatuses.includes(status) && (inventoryCount === 0)) {
      const inventoryItems = Array.from({ length: donation.quantity }).map(() => ({
        donation_id: donationId,
        computer_type: donation.computer_type === 'mixed' ? 'desktop' : donation.computer_type,
        status: 'received', 
        condition_received: donation.condition_status === 'mixed' ? 'needs-repair' : donation.condition_status,
        serial_number: `PENDING-${donationId}-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date(),
        updated_at: new Date()
      }));

      await supabaseAdmin.from('computer_inventory').insert(inventoryItems);
    }

    // 3. Prepare Update Data
    const updateData: any = { status };
    
    // If Admin provided a confirmed collection date, update the pickup_date
    if (collection_date) {
        updateData.pickup_date = collection_date;
    }

    // 4. Update Database
    const { data, error } = await supabaseAdmin
      .from('donations')
      .update(updateData)
      .eq('id', donationId)
      .select();

    if (error) throw error;

    // 5. SEND APPRECIATION EMAIL (If Approved)
    if (status === 'approved') {
        const pickupDateObj = new Date(collection_date || donation.pickup_date);
        const formattedDate = pickupDateObj.toDateString();

        const emailSubject = '🎉 Donation Approved - Computer for Schools Kenya';
        const emailBody = `
            Dear ${donation.donor_name},

            We are thrilled to accept your generous donation of ${donation.quantity} ${donation.computer_type}(s)! 
            
            Your contribution plays a vital role in bridging the digital divide for students in Kenya.

            **Collection Details:**
            Our team has scheduled to collect the equipment on: **${formattedDate}**
            at: ${donation.address}

            Please ensure the equipment is ready by then. If you need to reschedule, please reply to this email.

            Thank you for making a difference!

            Warm regards,
            The CFS Kenya Team
        `;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: donation.email,
                subject: emailSubject,
                text: emailBody
            });
            console.log(`Appreciation email sent to ${donation.email}`);
        } catch (emailErr) {
            console.error('Failed to send email:', emailErr);
        }
    }

    res.json({ message: 'Status updated and email sent', donation: data[0] });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};