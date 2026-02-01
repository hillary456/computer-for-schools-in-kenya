import { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { User } from '../types/index.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, user_type, organization, phone, location, admin_secret } = req.body;

    
    if (user_type === 'admin') {
      const ADMIN_KEY = process.env.ADMIN_REGISTRATION_KEY;
      if (!admin_secret || admin_secret !== ADMIN_KEY) {
        return res.status(403).json({ message: 'Invalid or missing Admin Secret Key.' });
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, user_type } },
    });

    if (authError) {
      return res.status(400).json({ message: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ message: 'Failed to create user.' });
    }

    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        name,
        email,
        user_type,
        organization: organization || null,
        phone: phone || null,
        location: location || null,
      }]);

    if (profileError) {
      return res.status(500).json({ message: 'Failed to create user profile.' });
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: authData.user.id, name, email, user_type },
    });
  } catch (e: any) {
    console.error('Registration error:', e);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(500).json({ message: 'User profile not found.' });
    }

    res.status(200).json({
      message: 'Login successful',
      token: authData.session?.access_token,
      user: userData,
    });
  } catch (e: any) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Server error during login' });
  }
}; 