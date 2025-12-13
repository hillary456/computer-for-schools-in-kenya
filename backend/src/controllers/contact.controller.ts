import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';
import { sendContactEmail } from '../utils/email.js';

export const createContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, subject, message } = req.body;

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
        status: 'unread'
      })
      .select()
      .single();

    if (error) {
      console.error('Contact message creation error:', error);
      res.status(500).json({ message: 'Failed to send message' });
      return;
    }


    await sendContactEmail({
      name,
      email,
      subject,
      message
    });

    res.status(201).json({
      message: 'Message sent successfully',
      contactMessage: data
    });
  } catch (error) {
    console.error('Create contact message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getContactMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
      return;
    }

    res.json({
      messages: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateMessageStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    res.json({
      message: 'Message status updated successfully',
      contactMessage: data
    });
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 