import { Request } from 'express';
 
export type UserType = 'donor' | 'school' | 'admin';
 
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        user_type: UserType;
      };
    }
  }
} 

export type AuthRequest = Request;

export interface User {
  id: string;
  name: string;
  email: string;
  user_type: UserType;
  organization?: string | null;
  phone?: string | null;
  location?: string | null;
  created_at?: string;
}
 
export type DonationStatus = 'pending' | 'approved' | 'collected' | 'processing' | 'delivered' | 'rejected';
export interface Donation {
  id: number;
  user_id: string | null;
  donor_name: string;
  organization?: string | null;
  email: string;
  phone: string;
  address: string;
  computer_type: string;
  quantity: number;
  condition_status: string;
  pickup_date?: string | null;
  message?: string | null;
  status: DonationStatus;
  created_at?: string;
}
 
export type RequestStatus = 'pending' | 'approved' | 'fulfilled' | 'rejected';
export interface SchoolRequest {
  id: number;
  user_id: string;
  school_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  computer_type: string;
  quantity: number;
  justification: string;
  status: RequestStatus;
  created_at?: string;
}
 
export type ContactStatus = 'unread' | 'read' | 'replied';
export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  created_at?: string;
}