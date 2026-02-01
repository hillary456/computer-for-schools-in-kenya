import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { data: pendingDonations } = await supabase
      .from('donations')
      .select('count', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: pendingRequests } = await supabase
      .from('school_requests')
      .select('count', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({
      statistics: {
        pending: {
          donations: pendingDonations || 0,
          requests: pendingRequests || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

export const getImpactReport = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('impact_statistics')
      .select('*')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate impact report' });
  }
};