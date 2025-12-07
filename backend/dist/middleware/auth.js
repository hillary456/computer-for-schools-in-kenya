import supabase from '../db/supabase.js';
export const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        return res.status(401).json({ message: 'Access denied. Invalid token.', details: error?.message });
    }
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_type, email')
        .eq('id', data.user.id)
        .single();
    if (userError || !userData) {
        return res.status(401).json({ message: 'Access denied. User profile not found.' });
    }
    req.user = {
        id: data.user.id,
        email: userData.email,
        user_type: userData.user_type,
    };
    next();
};
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.user_type !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};
