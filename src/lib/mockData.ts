import type { DeliveryRequest } from '@/types';

export const mockDeliveryRequests: DeliveryRequest[] = [
  {
    requestId: 'req1',
    customerName: 'Alice Wonderland', // LTR for now, will be Sindhi example later
    address: '123 Rabbit Hole Ln, Wonderland',
    orderDetails: '5 Gallon Spring Water x2, 1 Gallon Purified Water x1',
    status: 'planned',
    priority: 'normal',
    requestedAt: Date.now() - 3600000 * 2, // 2 hours ago
  },
  {
    requestId: 'req2',
    customerName: 'Bob The Builder',
    address: '456 Construction Ave, Builderville',
    orderDetails: '10 Gallon Mineral Water x1',
    status: 'planned',
    priority: 'emergency', // Example of an emergency request
    requestedAt: Date.now() - 3600000 * 1, // 1 hour ago
  },
  {
    requestId: 'req3',
    customerName: 'Charlie Brown',
    address: '789 Kite St, Peanutsville',
    orderDetails: '2.5 Gallon Distilled Water x3',
    status: 'delivered',
    priority: 'normal',
    requestedAt: Date.now() - 3600000 * 5, // 5 hours ago
    completedAt: Date.now() - 3600000 * 4, // 4 hours ago
  },
  {
    requestId: 'req4',
    customerName: 'Diana Prince', // Example of a Sindhi name: محمد علي
    address: '1 Amazon Cir, Themyscira',
    orderDetails: '5 Gallon Spring Water x5',
    status: 'planned',
    priority: 'normal',
    requestedAt: Date.now() - 3600000 * 0.5, // 30 minutes ago
  },
];
