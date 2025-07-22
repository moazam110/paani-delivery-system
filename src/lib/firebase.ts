import { v4 as uuidv4 } from 'uuid';
import type { Customer, DeliveryRequest, AdminNotification, AuthUser } from '@/types';

// Local storage keys
const STORAGE_KEYS = {
  CUSTOMERS: 'water_delivery_customers',
  DELIVERY_REQUESTS: 'water_delivery_requests',
  NOTIFICATIONS: 'water_delivery_notifications',
  CURRENT_USER: 'water_delivery_current_user',
  USERS: 'water_delivery_users'
};

// Default admin user
const DEFAULT_ADMIN = {
  id: 'admin-1',
  email: 'admin@waterdelivery.com',
  password: 'admin123',
  role: 'admin' as const
};

const DEFAULT_STAFF = {
  id: 'staff-1',
  email: 'staff@waterdelivery.com',
  password: 'staff123',
  role: 'staff' as const
};

// Initialize default data
export const initializeDefaultData = () => {
  if (typeof window === 'undefined') return;

  // Initialize users if not exists
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const users = [DEFAULT_ADMIN, DEFAULT_STAFF];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // Initialize customers if not exists
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    const defaultCustomers: Customer[] = [
      {
        customerId: uuidv4(),
        name: 'John Smith',
        phone: '+1-555-0123',
        address: '123 Main St, Anytown, USA',
        defaultCans: 5,
        notes: 'Regular customer, prefers morning delivery',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        customerId: uuidv4(),
        name: 'Sarah Johnson',
        phone: '+1-555-0456',
        address: '456 Oak Ave, Somewhere, USA',
        defaultCans: 3,
        notes: 'Weekend delivery preferred',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(defaultCustomers));
  }

  // Initialize delivery requests if not exists
  if (!localStorage.getItem(STORAGE_KEYS.DELIVERY_REQUESTS)) {
    localStorage.setItem(STORAGE_KEYS.DELIVERY_REQUESTS, JSON.stringify([]));
  }

  // Initialize notifications if not exists
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
};

// Auth functions
export const auth = {
  signIn: async (email: string, password: string): Promise<AuthUser> => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authUser));
    return authUser;
  },

  signOut: async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
  },

  onAuthStateChanged: (callback: (user: AuthUser | null) => void) => {
    // Simple implementation - in a real app you'd want a more sophisticated observer pattern
    const user = auth.getCurrentUser();
    callback(user);
    
    // Return unsubscribe function
    return () => {};
  }
};

// Database functions
export const db = {
  // Customers
  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    const customers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!customers) return [];
    return JSON.parse(customers).map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt)
    }));
  },

  addCustomer: (customer: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>): Customer => {
    const customers = db.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      customerId: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    customers.push(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return newCustomer;
  },

  updateCustomer: (customerId: string, updates: Partial<Customer>): Customer | null => {
    const customers = db.getCustomers();
    const index = customers.findIndex(c => c.customerId === customerId);
    if (index === -1) return null;

    customers[index] = {
      ...customers[index],
      ...updates,
      updatedAt: new Date()
    };
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    return customers[index];
  },

  // Delivery Requests
  getDeliveryRequests: (): DeliveryRequest[] => {
    if (typeof window === 'undefined') return [];
    const requests = localStorage.getItem(STORAGE_KEYS.DELIVERY_REQUESTS);
    if (!requests) return [];
    return JSON.parse(requests).map((r: any) => ({
      ...r,
      requestedAt: new Date(r.requestedAt),
      scheduledFor: r.scheduledFor ? new Date(r.scheduledFor) : undefined,
      deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
      completedAt: r.completedAt ? new Date(r.completedAt) : undefined
    }));
  },

  addDeliveryRequest: (request: Omit<DeliveryRequest, 'requestId' | 'requestedAt'>): DeliveryRequest => {
    const requests = db.getDeliveryRequests();
    const newRequest: DeliveryRequest = {
      ...request,
      requestId: uuidv4(),
      requestedAt: new Date()
    };
    requests.push(newRequest);
    localStorage.setItem(STORAGE_KEYS.DELIVERY_REQUESTS, JSON.stringify(requests));
    
    // Add notification
    db.addNotification({
      type: 'requestCreated',
      message: `New delivery request created for ${request.customerName}`,
      relatedDocId: newRequest.requestId,
      isRead: false,
      triggeredBy: auth.getCurrentUser()?.id
    });

    return newRequest;
  },

  updateDeliveryRequest: (requestId: string, updates: Partial<DeliveryRequest>): DeliveryRequest | null => {
    const requests = db.getDeliveryRequests();
    const index = requests.findIndex(r => r.requestId === requestId);
    if (index === -1) return null;

    requests[index] = {
      ...requests[index],
      ...updates
    };
    localStorage.setItem(STORAGE_KEYS.DELIVERY_REQUESTS, JSON.stringify(requests));
    return requests[index];
  },

  // Notifications
  getNotifications: (): AdminNotification[] => {
    if (typeof window === 'undefined') return [];
    const notifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!notifications) return [];
    return JSON.parse(notifications).map((n: any) => ({
      ...n,
      timestamp: new Date(n.timestamp)
    }));
  },

  addNotification: (notification: Omit<AdminNotification, 'notificationId' | 'timestamp'>): AdminNotification => {
    const notifications = db.getNotifications();
    const newNotification: AdminNotification = {
      ...notification,
      notificationId: uuidv4(),
      timestamp: new Date()
    };
    notifications.unshift(newNotification); // Add to beginning
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    return newNotification;
  },

  markNotificationAsRead: (notificationId: string): void => {
    const notifications = db.getNotifications();
    const index = notifications.findIndex(n => n.notificationId === notificationId);
    if (index !== -1) {
      notifications[index].isRead = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }
  },

  markAllNotificationsAsRead: (): void => {
    const notifications = db.getNotifications();
    notifications.forEach(n => n.isRead = true);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  initializeDefaultData();
}
