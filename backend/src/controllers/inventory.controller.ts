import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

// Get Inventory with optional status filter (e.g., ?status=received or ?status=ready)
export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    
    let query = supabaseAdmin
      .from('computer_inventory')
      .select('*, donations(donor_name)')
      .order('created_at', { ascending: false });

    // Filter by status if provided (separates 'received' from 'ready')
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ message: 'Failed to fetch inventory' });
      return;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// NEW: Action to Refurbish / Update Item Details
export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, condition_after_refurbishment, refurbishment_notes } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('computer_inventory')
      .update({ 
        status, 
        condition_after_refurbishment, 
        refurbishment_notes,
        updated_at: new Date()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ message: 'Inventory item updated successfully', item: data[0] });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Update failed' });
  }
};

// backend/src/controllers/inventory.controller.ts

export const fulfillRequest = async (req: Request, res: Response): Promise<void> => {
  const { inventoryId, requestId } = req.body;

  try {
    // 1. Mark Inventory as Delivered & Assigned
    const { error: invError } = await supabaseAdmin
      .from('computer_inventory')
      .update({ 
        status: 'delivered', 
        assigned_school_id: requestId,
        updated_at: new Date()
      })
      .eq('id', inventoryId);

    if (invError) throw invError;

    // 2. Fetch the Request details (Quantity needed vs Quantity already received)
    // We need to count how many items are NOW assigned to this request
    const { count: assignedCount, error: countError } = await supabaseAdmin
      .from('computer_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_school_id', requestId);

    if (countError) throw countError;

    const { data: requestData, error: reqError } = await supabaseAdmin
      .from('school_requests')
      .select('quantity, school_name') // Get requested quantity
      .eq('id', requestId)
      .single();

    if (reqError) throw reqError;

    // 3. Check if we should mark as FULFILLED
    // If the number of assigned computers matches (or exceeds) the requested amount
    if (requestData && (assignedCount || 0) >= requestData.quantity) {
        await supabaseAdmin
            .from('school_requests')
            .update({ status: 'fulfilled' })
            .eq('id', requestId);
            
        console.log(`Request ${requestId} marked as fulfilled.`);
    }

    // 4. Update School Stats (Existing logic)
    if (requestData) {
        await supabaseAdmin.rpc('increment_school_computers', { 
            school_name_input: requestData.school_name, 
            count: 1 
        });
    }

    res.json({ message: 'Computer successfully assigned to school.' });
  } catch (error: any) {
    console.error('Fulfillment error:', error);
    res.status(500).json({ message: 'Failed to fulfill request' });
  }
};