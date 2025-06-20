
export interface AdminUser {
  adminId: string; // Firebase Auth UID
  email: string;
  verified: boolean; // True if the admin has been approved
  role?: 'superadmin' | 'admin'; // Role of the admin
  createdAt: any; // Firestore Timestamp
}

export interface Customer {
  customerId: string; // Auto-generated Firestore document ID
  name: string;
  phone?: string;
  address: string;
  profilePictureUrl?: string; // URL to the profile picture in Firebase Storage (optional)
  defaultCans: number;
  notes?: string;
  createdAt: any; // Firestore Server Timestamp
  updatedAt: any; // Firestore Server Timestamp
}

export interface DeliveryRequest {
  requestId: string; // Firestore document ID
  customerId: string; // Link to Customer document
  customerName: string; // Denormalized for easier display
  address: string; // Denormalized for easier display
  cans: number;
  orderDetails?: string; // e.g., specific water types, special instructions from customer
  priority: 'normal' | 'emergency';
  status: 'pending' | 'pending_confirmation' | 'delivered' | 'cancelled'; 
  requestedAt: any; // Firestore Timestamp - When the request was logged into the system
  scheduledFor?: any; // Firestore Timestamp - Optional: When the delivery is specifically scheduled by admin
  deliveredAt?: any; // Firestore Timestamp - Optional: When the delivery was completed
  completedAt?: any; // Firestore Timestamp for staff app or general completion tracking
  createdBy?: string; // UID of admin/staff who created or 'customer_portal' etc.
  internalNotes?: string; // Optional: Internal notes for admin/staff about this request - kept for schema flexibility
}

export interface AdminNotification {
  notificationId: string; // Firestore document ID
  type: 'requestCancelled' | 'newCustomer' | 'requestCreated' | 'generic'; // Extend as needed
  message: string;
  relatedDocId?: string; // e.g., cancelled requestId or new customerId
  timestamp: any; // Firestore Server Timestamp
  isRead: boolean;
  triggeredBy?: string; // UID of admin who performed action, or system
}
