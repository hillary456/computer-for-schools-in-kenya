import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

export const getImpactStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('impact_statistics')
      .select('*')
      .single();

    if (error) {
      console.error('Impact statistics error:', error);
      res.status(500).json({ message: 'Failed to fetch statistics' });
      return;
    }

    res.json({ statistics: data });
  } catch (error) {
    console.error('Get impact statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get various statistics
    const [
      donationsResult,
      schoolsResult,
      requestsResult,
      messagesResult
    ] = await Promise.all([
      supabase.from('donations').select('*', { count: 'exact', head: true }),
      supabase.from('schools').select('*', { count: 'exact', head: true }),
      supabase.from('school_requests').select('*', { count: 'exact', head: true }),
      supabase.from('contact_messages').select('*', { count: 'exact', head: true })
    ]);

    // Get pending counts
    const [
      pendingDonations,
      pendingRequests,
      unreadMessages
    ] = await Promise.all([
      supabase.from('donations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('school_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread')
    ]);

    // Get delivered donations count and sum
    const { data: deliveredDonations } = await supabase
      .from('donations')
      .select('quantity')
      .eq('status', 'delivered');

    const totalComputersDelivered = deliveredDonations?.reduce((sum, d) => sum + d.quantity, 0) || 0;

    res.json({
      statistics: {
        total: {
          donations: donationsResult.count || 0,
          schools: schoolsResult.count || 0,
          requests: requestsResult.count || 0,
          messages: messagesResult.count || 0,
          computersDelivered: totalComputersDelivered
        },
        pending: {
          donations: pendingDonations.count || 0,
          requests: pendingRequests.count || 0,
          unreadMessages: unreadMessages.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};