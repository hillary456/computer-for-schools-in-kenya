import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
// FIX 1: Import supabaseAdmin to allow bypassing RLS for updates
import { supabase, supabaseAdmin } from '../config/supabase.js';

export const createSchoolRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const requestData = {
      ...req.body,
      user_id: req.user?.id,
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('school_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.error('School request creation error:', error);
      res.status(500).json({ message: 'Failed to create request' });
      return;
    }

    res.status(201).json({
      message: 'School request submitted successfully',
      request: data
    });
  } catch (error) {
    console.error('Create school request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSchoolRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('school_requests')
      .select('*, users(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      res.status(500).json({ message: 'Failed to fetch school requests' });
      return;
    }

    res.json({
      requests: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get school requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSchoolRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('school_requests')
      .select('*, users(name, email)')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ message: 'School request not found' });
      return;
    }

    if (req.user?.user_type !== 'admin' && data.user_id !== req.user?.id) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ request: data });
  } catch (error) {
    console.error('Get school request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserSchoolRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (req.user?.user_type !== 'admin' && req.user?.id !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const { data, error } = await supabase
      .from('school_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ message: 'Failed to fetch user requests' });
      return;
    }

    res.json({ requests: data });
  } catch (error) {
    console.error('Get user school requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;
    const requestId = parseInt(id, 10);

    // FIX 2: Use supabaseAdmin to bypass RLS and .select() to avoid crashes
    const { data, error } = await supabaseAdmin
      .from('school_requests')
      .update({ status })
      .eq('id', requestId)
      .select();

    if (error) {
      console.error('Update request status error:', error);
      res.status(500).json({ message: error.message });
      return;
    }

    if (!data || data.length === 0) {
      res.status(404).json({ message: 'School request not found or permission denied' });
      return;
    }

    res.json({
      message: 'Request status updated successfully',
      request: data[0]
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('schools')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (location) {
      query = query.eq('location', location);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      res.status(500).json({ message: 'Failed to fetch schools' });
      return;
    }

    res.json({
      schools: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSchoolById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      res.status(404).json({ message: 'School not found' });
      return;
    }

    res.json({ school: data });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 
 

export const fulfillSchoolRequest = async (req: Request, res: Response): Promise<void> => {
  const { requestId, inventoryItemIds } = req.body; // IDs from computer_inventory table

  try {
    // 1. Update inventory status and link to the request
    const { error: invError } = await supabaseAdmin
      .from('computer_inventory')
      .update({ 
        status: 'delivered', 
        assigned_school_id: requestId 
      })
      .in('id', inventoryItemIds);

    if (invError) throw invError;

    // 2. Mark the school request as fulfilled
    const { error: reqError } = await supabaseAdmin
      .from('school_requests')
      .update({ status: 'fulfilled' })
      .eq('id', requestId);

    if (reqError) throw reqError;

    // 3. Update the total computers received for the school record
    // Note: This assumes school_requests.school_name matches schools.name
    const { data: requestData } = await supabase
      .from('school_requests')
      .select('school_name')
      .eq('id', requestId)
      .single();

    if (requestData) {
      await supabaseAdmin.rpc('increment_school_computers', { 
        s_name: requestData.school_name, 
        count: inventoryItemIds.length 
      });
    }

    res.json({ message: 'Request fulfilled and inventory updated successfully' });
  } catch (error: any) {
    console.error('Fulfillment error:', error);
    res.status(500).json({ message: error.message || 'Failed to fulfill request' });
  }
};