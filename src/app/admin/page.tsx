"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, ListChecks, Settings, LogOut, UserPlus, Bell, PackageCheck, Pencil, PackageSearch, Plus } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { Customer, DeliveryRequest, AdminNotification, AuthUser } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { format, startOfDay, endOfDay, isToday } from 'date-fns';

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  
  const [isCustomerFormDialogOpen, setIsCustomerFormDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [editingRequestData, setEditingRequestData] = useState<DeliveryRequest | null>(null);
  const [customerToPreselectForRequest, setCustomerToPreselectForRequest] = useState<Customer | null>(null);
  
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);

  // Load data from local storage
  const loadData = () => {
    setCustomers(db.getCustomers());
    setDeliveryRequests(db.getDeliveryRequests());
    setNotifications(db.getNotifications());
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.role === 'admin') {
        setAuthUser(user);
        loadData();
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [router]);

  // Refresh data when dialogs close
  useEffect(() => {
    if (!isCustomerFormDialogOpen && !isRequestDialogOpen) {
      loadData();
    }
  }, [isCustomerFormDialogOpen, isRequestDialogOpen]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      router.push('/');
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out.",
        variant: "destructive",
      });
    }
  };

  const handleCreateCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerFormDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerFormDialogOpen(true);
  };

  const handleCreateDeliveryRequest = (customer?: Customer) => {
    setEditingRequestData(null);
    setCustomerToPreselectForRequest(customer || null);
    setIsRequestDialogOpen(true);
  };

  const handleEditDeliveryRequest = (request: DeliveryRequest) => {
    setEditingRequestData(request);
    setCustomerToPreselectForRequest(null);
    setIsRequestDialogOpen(true);
  };

  const handleMarkRequestDelivered = (requestId: string) => {
    const updatedRequest = db.updateDeliveryRequest(requestId, {
      status: 'delivered',
      deliveredAt: new Date(),
      completedAt: new Date()
    });

    if (updatedRequest) {
      loadData();
      toast({
        title: "Request marked as delivered",
        description: `Delivery request for ${updatedRequest.customerName} has been completed.`,
      });
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    db.markNotificationAsRead(notificationId);
    loadData();
  };

  const markAllNotificationsAsRead = () => {
    db.markAllNotificationsAsRead();
    loadData();
    setIsNotificationPopoverOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  // Calculate statistics
  const totalCustomers = customers.length;
  const pendingDeliveries = deliveryRequests.filter(r => r.status === 'pending' || r.status === 'pending_confirmation').length;
  const deliveriesToday = deliveryRequests.filter(r => isToday(r.requestedAt) || (r.scheduledFor && isToday(r.scheduledFor)));
  const deliveriesTodayCount = deliveriesToday.length;
  const totalCansToday = deliveriesToday.reduce((sum, r) => sum + r.cans, 0);
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {authUser.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadNotificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadNotificationCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadNotificationCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.notificationId}
                          className={`p-3 rounded-lg border ${
                            notification.isRead ? 'bg-muted/50' : 'bg-primary/10'
                          }`}
                          onClick={() => markNotificationAsRead(notification.notificationId)}
                        >
                          <p className="text-sm font-medium">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(notification.timestamp, 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingDeliveries}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
              <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveriesTodayCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cans Today</CardTitle>
              <PackageSearch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCansToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage your water delivery customers</CardDescription>
              </div>
              <Button onClick={handleCreateCustomer}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.slice(0, 5).map((customer) => (
                  <div key={customer.customerId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.address}</p>
                      <p className="text-sm text-muted-foreground">Default: {customer.defaultCans} cans</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateDeliveryRequest(customer)}
                      >
                        Create Request
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCustomer(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No customers yet</p>
                )}
              </div>
            </CardContent>
            {customers.length > 5 && (
              <CardFooter>
                <Link href="/admin/customers" className="w-full">
                  <Button variant="outline" className="w-full">
                    View All Customers ({customers.length})
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          {/* Delivery Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Delivery Requests</CardTitle>
                <CardDescription>Latest delivery requests and their status</CardDescription>
              </div>
              <Button onClick={() => handleCreateDeliveryRequest()}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveryRequests.slice(0, 5).map((request) => (
                  <div key={request.requestId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{request.customerName}</p>
                      <p className="text-sm text-muted-foreground">{request.address}</p>
                      <p className="text-sm text-muted-foreground">{request.cans} cans</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                          request.status === 'delivered' ? 'default' :
                          request.status === 'pending' ? 'secondary' :
                          request.status === 'pending_confirmation' ? 'outline' : 'destructive'
                        }>
                          {request.status}
                        </Badge>
                        {request.priority === 'emergency' && (
                          <Badge variant="destructive">Emergency</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {request.status !== 'delivered' && request.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkRequestDelivered(request.requestId)}
                        >
                          Mark Delivered
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditDeliveryRequest(request)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {deliveryRequests.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No delivery requests yet</p>
                )}
              </div>
            </CardContent>
            {deliveryRequests.length > 5 && (
              <CardFooter>
                <Link href="/admin/requests" className="w-full">
                  <Button variant="outline" className="w-full">
                    View All Requests ({deliveryRequests.length})
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
    
