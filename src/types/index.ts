export interface AdminUser {
  adminId: string;
  email: string;
  verified: boolean;
  role?: 'superadmin' | 'admin';
  createdAt: Date;
}

export interface Customer {
  customerId: string;
  name: string;
  phone?: string;
  address: string;
  profilePictureUrl?: string;
  defaultCans: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRequest {
  requestId: string;
  customerId: string;
  customerName: string;
  address: string;
  cans: number;
  orderDetails?: string;
  priority: 'normal' | 'emergency';
  status: 'pending' | 'pending_confirmation' | 'delivered' | 'cancelled'; 
  requestedAt: Date;
  scheduledFor?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  internalNotes?: string;
}

export interface AdminNotification {
  notificationId: string;
  type: 'requestCancelled' | 'newCustomer' | 'requestCreated' | 'generic';
  message: string;
  relatedDocId?: string;
  timestamp: Date;
  isRead: boolean;
  triggeredBy?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'staff';
}
