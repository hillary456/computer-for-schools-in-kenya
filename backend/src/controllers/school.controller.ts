 import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import { supabase, supabaseAdmin } from '../config/supabase.js';

// Configure Email Transporter
// Ensure EMAIL_USER and EMAIL_PASS are set in your .env file
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 1. Create a School Request (with Reason)
// backend/src/controllers/school.controller.ts

export const createSchoolRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // --- FIX IS HERE ---
    const requestData = {
      user_id: req.user?.id,
      
      // Map Frontend fields to Database columns
      school_name: req.body.school_name,
      contact_person: req.body.contact_person, // Fixes previous error
      email: req.body.email,                   // Fixes previous error
      phone: req.body.phone,                   // Fixes previous error
      location: req.body.location,
      computer_type: req.body.computer_type,
      quantity: req.body.quantity,

      // CRITICAL FIX: Map 'reason_for_request' (Frontend) to 'justification' (Database)
      justification: req.body.reason_for_request, 
      
      status: 'pending'
    };
    // -------------------

    const { data, error } = await supabase
      .from('school_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) {
      console.error('School request creation error:', error);
      res.status(500).json({ message: 'Failed to create request: ' + error.message });
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

// 2. Get All School Requests (Admin)
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

// 3. Get Single Request by ID
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

    // Access Control: Only Admin or the Owner can view
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

// 4. Get User's Own Requests
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

// 5. Update Request Status (Admin Action + Email)
 export const updateRequestStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, admin_comment } = req.body; // Capture optional comment
        const requestId = parseInt(id, 10);

        // 1. Fetch current request & user email (Required for sending email)
        const { data: request, error: fetchError } = await supabaseAdmin
            .from('school_requests')
            .select('*, users(email, name)') // Join with users to get email
            .eq('id', requestId)
            .single();

        if (fetchError || !request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }

        // 2. Update Status in Database
        const { error: updateError } = await supabaseAdmin
            .from('school_requests')
            .update({ 
                status: status,
                // You might want to add a column for admin comments in your DB
                // admin_comment: admin_comment 
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('Update failed:', updateError);
            res.status(500).json({ message: 'Failed to update status' });
            return;
        }

        // 3. Send Email Notification
        if (request.users && request.users.email) {
            const emailSubject = 
                status === 'approved' ? '🎉 Good News: Your Equipment Request is Approved!' :
                status === 'rejected' ? 'Update on your Equipment Request' :
                'Status Update: Equipment Request';

            const emailBody = `
                Dear ${request.users.name || 'Partner School'},

                Your request for ${request.quantity} ${request.computer_type}(s) has been updated to: **${status.toUpperCase()}**.
                
                ${admin_comment ? `**Admin Note:** ${admin_comment}` : ''}

                ${status === 'approved' ? 'Our team will contact you shortly regarding delivery/pickup arrangements.' : ''}
                ${status === 'rejected' ? 'You may apply again in the future or contact us for more details.' : ''}

                Best Regards,
                Computer for Schools Kenya Team
            `;

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: request.users.email,
                    subject: emailSubject,
                    text: emailBody // Plain text body
                    // html: '<p>...</p>' // You can use HTML here for nicer emails
                });
                console.log(`Email sent to ${request.users.email}`);
            } catch (emailErr) {
                console.error('Failed to send email:', emailErr);
                // We don't return an error to the frontend here, because the DB update succeeded.
            }
        }

        res.json({ message: `Request updated to ${status}` });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// 6. Get Schools Directory (Optional, for filters)
export const getSchools = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('schools') // Assuming 'schools' table or 'users' table with type='school'
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (location) {
      query = query.eq('location', location);
    }

    // You might filter by status if you have verified/unverified schools
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

// 7. Get School Details
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

// 8. Fulfill Request (Logic to move Inventory to School)
export const fulfillSchoolRequest = async (req: Request, res: Response): Promise<void> => {
  const { requestId, inventoryItemIds } = req.body; // Expects an array of Inventory IDs

  try {
    // 1. Update inventory status and link to the request
    const { error: invError } = await supabaseAdmin
      .from('computer_inventory')
      .update({ 
        status: 'delivered', 
        assigned_school_id: requestId,
        updated_at: new Date()
      })
      .in('id', inventoryItemIds); // Updates multiple items at once

    if (invError) throw invError;

    // 2. Mark the school request as fulfilled
    const { error: reqError } = await supabaseAdmin
      .from('school_requests')
      .update({ status: 'fulfilled' })
      .eq('id', requestId);

    if (reqError) throw reqError;

    // 3. Update the total computers received for the school record (Impact Tracking)
    const { data: requestData } = await supabaseAdmin
      .from('school_requests')
      .select('school_name')
      .eq('id', requestId)
      .single();

    if (requestData) {
      // Calls a Postgres function to safely increment the counter
      await supabaseAdmin.rpc('increment_school_computers', { 
        school_name_input: requestData.school_name, 
        count: inventoryItemIds.length 
      });
    }

    res.json({ message: 'Request fulfilled and inventory updated successfully' });
  } catch (error: any) {
    console.error('Fulfillment error:', error);
    res.status(500).json({ message: error.message || 'Failed to fulfill request' });
  }
};