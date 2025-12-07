import { Router, Response } from 'express';
import { AuthRequest, User, UserType } from '../types.js';
import {supabase, supabaseAdmin} from '../db/supabase.js';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
 
router.post('/register', async (req: AuthRequest, res: Response) => {
  const { name, email, password, user_type, organization, phone, location } = req.body;

  const missing_fields = [];
  if (!name) missing_fields.push('name');
  if (!email) missing_fields.push('email');
  if (!password) missing_fields.push('password');
  if (!user_type) missing_fields.push('user_type');

  if (missing_fields.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'All required fields must be filled.',
      missing_fields
    });
  }

  if (!['donor', 'school', 'admin'].includes(user_type)) {
      return res.status(400).json({ success: false, message: 'Invalid user_type.' });
  }
  
  try { 
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password, 
      options: {
        data: { name, user_type }
      }
    });

    if (authError) { 
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ success: false, message: 'Email already exists.' });
      }
      return res.status(500).json({ success: false, message: 'Unable to register user.', details: authError.message });
    }

    if (!authData.user) {
        return res.status(500).json({ success: false, message: 'User object not returned after registration.' });
    } 
    
    const newUserProfile: Partial<User> = {
        id: authData.user.id,
        name,
        email,
        user_type,
        organization: organization || null,
        phone: phone || null,
        location: location || null,
    }; 

    const { error: profileError } = await (supabaseAdmin ||supabase)
      .from('users')
      .insert([newUserProfile]);

    if (profileError) { 
        console.error('Profile insert error:', profileError); 
        return res.status(500).json({ success: false, message: 'User registered, but profile data failed to save.' });
    }
 
    const user_data = {
        id: authData.user.id,
        name,
        email,
        user_type,
    };

    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Check your email for confirmation.',
      token: authData.session?.access_token,  
      user: user_data
    });

  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});
 
router.post('/login', async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try { 
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) { 
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!authData.user) {
      return res.status(401).json({ success: false, message: 'Login failed. User not found.' });
    }
 
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, user_type, organization, location')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ success: false, message: 'User profile data missing.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: authData.session?.access_token,
      user: {
        id: userData.id,
        name: userData.name,
        user_type: userData.user_type,
        organization: userData.organization,
        location: userData.location,
      },
    });

  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'System Error', details: e.message });
  }
});
 
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user!.id;
         
        const { data: userData, error } = await supabase
            .from('users')
            .select('id, name, email, user_type, organization, phone, location, created_at')
            .eq('id', user_id)
            .single();

        if (error || !userData) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, user: userData });

    } catch (e: any) {
        return res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});
 
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user!.id;
        const { name, organization, phone, location } = req.body;

        const updateData: Partial<User> = {};
        if (name) updateData.name = name;
        if (organization) updateData.organization = organization;
        if (phone) updateData.phone = phone;
        if (location) updateData.location = location;
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update.' });
        }

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user_id);

        if (error) {
            console.error('Update profile error:', error);
            return res.status(500).json({ success: false, message: 'Unable to update profile.' });
        }

        return res.status(200).json({ success: true, message: 'Profile updated successfully.' });

    } catch (e: any) {
        return res.status(500).json({ success: false, message: 'System Error', details: e.message });
    }
});


export default router;