import { Request } from 'express';

export type UserRoleType = 'donor' | 'school' | 'admin';
export type DonationComputerType = 'desktop' | 'laptop' | 'tablet' | 'mixed';
export type DonationConditionType = 'working' | 'needs-repair' | 'not-working' | 'mixed';
export type DonationStatusType = 'pending' | 'approved' | 'collected' | 'processing' | 'delivered' | 'rejected';
export type RequestComputerType = 'desktop' | 'laptop' | 'tablet' | 'any';
export type RequestStatusType = 'pending' | 'approved' | 'fulfilled' | 'rejected';
export type ContactStatusType = 'unread' | 'read' | 'replied';
export type InventoryComputerType = 'desktop' | 'laptop' | 'tablet';
export type InventoryConditionRecvType = 'working' | 'needs-repair' | 'not-working';
export type InventoryConditionRefurbType = 'excellent' | 'good' | 'fair' | 'unusable';
export type InventoryStatusType = 'received' | 'in-refurbishment' | 'ready' | 'delivered' | 'unusable';
export type SchoolLevelType = 'primary' | 'secondary' | 'tertiary';
export type SchoolStatusType = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  user_type: UserRoleType;
  organization?: string | null;
  phone?: string | null;
  location?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: number;
  user_id?: string | null;
  donor_name: string;
  organization?: string | null;
  email: string;
  phone: string;
  address: string;
  computer_type: DonationComputerType;
  quantity: number;
  condition_status: DonationConditionType;
  pickup_date?: string | null;
  message?: string | null;
  status: DonationStatusType;
  created_at: string;
  updated_at: string;
}

export interface SchoolRequest {
  id: number;
  user_id: string;
  school_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  computer_type: RequestComputerType;
  quantity: number;
  justification: string;
  status: RequestStatusType;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatusType;
  created_at: string;
}

export interface School {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  location?: string | null;
  school_type: SchoolLevelType;
  student_count?: number | null;
  computers_received: number;
  status: SchoolStatusType;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  id: string;
  sub?: string;
  email: string;
  user_type: UserRoleType;
}

export interface AuthRequest extends Request {
  user: JWTPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
