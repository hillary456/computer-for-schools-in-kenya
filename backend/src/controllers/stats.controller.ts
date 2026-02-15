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

export const getAdvancedReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { start_date, end_date, month } = req.query;

    // 1. Summary Counts (Donors & Schools)
    const { count: donorCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'donor');

    const { count: schoolCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'school');

    // 2. Approvals in a Certain Period (Donations & Requests)
    let donationsQuery = supabaseAdmin
      .from('donations')
      .select('id, donor_name, quantity, computer_type, updated_at')
      .eq('status', 'approved');

    let requestsQuery = supabaseAdmin
      .from('school_requests')
      .select('id, school_name, quantity, location, updated_at')
      .eq('status', 'approved');

    // Apply Date Filters if provided
    if (start_date && end_date) {
      donationsQuery = donationsQuery.gte('updated_at', start_date).lte('updated_at', end_date);
      requestsQuery = requestsQuery.gte('updated_at', start_date).lte('updated_at', end_date);
    }

    const { data: approvedDonations } = await donationsQuery;
    const { data: approvedRequests } = await requestsQuery;

    // 3. Distribution Reports (Arranged by Location & Month)
    // We fetch all fulfilled requests to process the grouping in code (easier than complex SQL via Supabase JS)
    const { data: distributedItems } = await supabaseAdmin
      .from('school_requests')
      .select('school_name, location, quantity, computer_type, updated_at')
      .eq('status', 'fulfilled')
      .order('location', { ascending: true });

    // Grouping Logic
    const distributionReport: any = {};
    
    if (distributedItems) {
      distributedItems.forEach(item => {
        const date = new Date(item.updated_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        const locationKey = item.location || 'Unknown';

        if (!distributionReport[locationKey]) {
          distributionReport[locationKey] = {};
        }
        if (!distributionReport[locationKey][monthKey]) {
          distributionReport[locationKey][monthKey] = 0;
        }
        
        distributionReport[locationKey][monthKey] += item.quantity;
      });
    }

    res.json({
      summary: {
        total_donors: donorCount,
        total_schools: schoolCount
      },
      approvals: {
        donations: approvedDonations || [],
        requests: approvedRequests || []
      },
      distribution_by_location_month: distributionReport
    });

  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ message: 'Server error generating reports' });
  }
};