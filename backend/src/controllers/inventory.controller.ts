import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js'; // Use supabaseAdmin for writes

export const getInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('computer_inventory')
      .select('*, donations(donor_name)') // Optional: get donor name too
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIC FOR GIVING OUT DONATIONS
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

    // 2. (Optional) Check if school request is fully satisfied
    // You could calculate this here, but simplest is to leave request as 'approved' or 'fulfilled' manually or via another check.
    
    // 3. IMPORTANT: Update the School's "computers_received" count (for reports)
    // First get the school name from the request
    const { data: reqData } = await supabase
        .from('school_requests')
        .select('school_name')
        .eq('id', requestId)
        .single();
        
    if (reqData) {
        // Increment the main schools table count
        // Note: This relies on school names matching. Ideally use school_id if you have it.
        const { error: schoolError } = await supabaseAdmin.rpc('increment_school_computers', { 
            school_name_input: reqData.school_name, 
            count: 1 
        });
        // If RPC doesn't exist, you can do a standard select+update here instead
    }

    res.json({ message: 'Computer successfully assigned to school.' });
  } catch (error: any) {
    console.error('Fulfillment error:', error);
    res.status(500).json({ message: 'Failed to fulfill request' });
  }
}; 