 import { Request, Response } from 'express';
// Import supabaseAdmin to bypass RLS policies for admin stats
import { supabase, supabaseAdmin } from '../config/supabase.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // 1. Get Pending Donations Count (Bypass RLS)
    const { count: pendingDonations, error: donationsError } = await supabaseAdmin
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (donationsError) throw donationsError;

    // 2. Get Pending School Requests Count (Bypass RLS)
    const { count: pendingRequests, error: requestsError } = await supabaseAdmin
      .from('school_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (requestsError) throw requestsError;

    res.json({
      statistics: {
        pending: {
          donations: pendingDonations || 0,
          requests: pendingRequests || 0
        }
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

export const getImpactReport = async (req: Request, res: Response) => {
  try {
    // Use supabaseAdmin to ensure global counts are accurate
    const { data, error } = await supabaseAdmin
      .from('impact_statistics')
      .select('*')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Impact report error:', error);
    res.status(500).json({ message: 'Failed to generate impact report' });
  }
};

// NEW: Get Beneficiaries List for Timeline
export const getBeneficiaries = async (req: Request, res: Response) => {
  try {
    // Fetch from the database view 'view_beneficiaries'
    // Ensure you have created this view in your Supabase SQL Editor
    const { data, error } = await supabaseAdmin
      .from('view_beneficiaries') 
      .select('*')
      .order('date_received', { ascending: false }); // Show most recent distributions first

    if (error) {
        console.error('Beneficiaries view error:', error);
        res.status(500).json({ error: error.message });
        return;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Server error fetching beneficiaries:', error);
    res.status(500).json({ message: 'Server error' });
  }
};