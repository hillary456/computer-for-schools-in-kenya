import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRoleType } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
     
    const userPayload: JWTPayload = {
      id: decoded.sub || decoded.id,  
      email: decoded.email,
      user_type: decoded.user_metadata?.user_type || decoded.user_type || 'donor'  
    };

    req.user = userPayload;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);  
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const authorizeRoles = (...roles: UserRoleType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.user_type)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}; 