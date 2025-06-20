
"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, ListChecks, Settings, LogOut, UserPlus, Bell, PackageCheck, Pencil, PackageSearch } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, onSnapshot, Timestamp, getCountFromServer, orderBy, doc, updateDoc, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { Customer, DeliveryRequest, AdminNotification } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import CustomerForm from '@/components/forms/CustomerForm';
import CreateDeliveryRequestForm from '@/components/forms/CreateDeliveryRequestForm';
import CustomerList from '@/components/admin/CustomerList';
import DeliveryRequestList from '@/components/admin/DeliveryRequestList';
import NotificationItem from '@/components/notifications/NotificationItem';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function AdminDashboardPage() {
  const router = useRouter();
  
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  
  const [isCustomerFormDialogOpen, setIsCustomerFormDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null); 

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [editingRequestData, setEditingRequestData] = useState<DeliveryRequest | null>(null);
  const [customerToPreselectForRequest, setCustomerToPreselectForRequest] = useState<Customer | null>(null);

  const [totalCustomers, setTotalCustomers] = useState(0);
  const [pendingDeliveries, setPendingDeliveries] = useState(0);
  const [deliveriesTodayCount, setDeliveriesTodayCount] = useState(0);
  const [totalCansToday, setTotalCansToday] = useState(0);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setIsLoading(false);
      } else {
        setAuthUser(null);
        setIsLoading(true); 
        router.push('/admin/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (authUser) { 
      const customersColRef = collection(db, 'customers');
      const unsubscribeCustomersCount = onSnapshot(customersColRef, async () => {
        try {
            const snapshot = await getCountFromServer(customersColRef);
            setTotalCustomers(snapshot.data().count);
        } catch (error) {
            console.error("Error fetching customer count:", error);
        }
      });
    
      const deliveryRequestsColRef = collection(db, 'deliveryRequests');
      const qDeliveries = query(deliveryRequestsColRef); 
      const unsubscribeDeliveries = onSnapshot(qDeliveries, (snapshot) => {
          let pendingCount = 0;
          let todayDeliveryCount = 0;
          let cansTodaySum = 0;
          const todayStart = startOfDay(new Date());
          const todayEnd = endOfDay(new Date());

          snapshot.forEach(doc => {
              const request = doc.data() as DeliveryRequest;
              if (request.status === 'pending' || request.status === 'pending_confirmation') {
                  pendingCount++;
              }
              if (request.status === 'delivered' && request.deliveredAt) {
                  const deliveredDate = (request.deliveredAt as Timestamp).toDate();
                  if (isWithinInterval(deliveredDate, { start: todayStart, end: todayEnd })) {
                      todayDeliveryCount++;
                      cansTodaySum += request.cans || 0;
                  }
              }
          });
          setPendingDeliveries(pendingCount);
          setDeliveriesTodayCount(todayDeliveryCount);
          setTotalCansToday(cansTodaySum);
      });

      const notificationsQuery = query(collection(db, 'adminNotifications'), orderBy('timestamp', 'desc'));
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
          const fetchedNotifications: AdminNotification[] = [];
          let unreadCount = 0;
          snapshot.forEach(doc => {
              const data = doc.data();
              const notification = {
                  notificationId: doc.id,
                  ...data,
                  timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
              } as AdminNotification;
              fetchedNotifications.push(notification);
              if (!notification.isRead) {
                  unreadCount++;
              }
          });
          setNotifications(fetchedNotifications);
          setUnreadNotificationCount(unreadCount);
      });
      
      return () => {
          unsubscribeCustomersCount();
          unsubscribeDeliveries();
          unsubscribeNotifications();
      };
    } else {
      setTotalCustomers(0);
      setPendingDeliveries(0);
      setDeliveriesTodayCount(0);
      setTotalCansToday(0);
      setNotifications([]);
      setUnreadNotificationCount(0);
    }
  }, [authUser]); 


  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const openRequestDialog = (requestToEdit?: DeliveryRequest, customerToPreselect?: Customer) => {
    if (requestToEdit) {
        setEditingRequestData(requestToEdit);
        setCustomerToPreselectForRequest(null); 
    } else if (customerToPreselect) {
        setCustomerToPreselectForRequest(customerToPreselect);
        setEditingRequestData(null); 
    } else { 
        setEditingRequestData(null);
        setCustomerToPreselectForRequest(null);
    }
    setIsRequestDialogOpen(true);
  };

  const closeRequestDialog = () => {
    setIsRequestDialogOpen(false);
    setEditingRequestData(null);
    setCustomerToPreselectForRequest(null);
  };

  const handleOpenNotificationPopover = (open: boolean) => {
    setIsNotificationPopoverOpen(open);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerFormDialogOpen(true);
  };

  const handleAddNewCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerFormDialogOpen(true);
  }


  if (isLoading) { 
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--accent))]/10">
        <Card className="w-full max-w-md text-center glass-card">
          <CardHeader><CardTitle>Loading Dashboard...</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto bg-muted/50" />
            <Skeleton className="h-12 w-full bg-muted/50" /><Skeleton className="h-12 w-full bg-muted/50" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!authUser) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--accent))]/10">
         <Card className="w-full max-w-xs text-center glass-card p-6">
           <CardHeader><CardTitle>Loading...</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto bg-muted/50" />
            </CardContent>
         </Card>
       </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--accent))]/5">
      <div className="sticky top-0 z-50 flex justify-between items-center p-3 md:p-4 shadow-lg bg-white/70 backdrop-blur-lg border-b border-[hsl(var(--border))]/50">
        <Link href="/admin" passHref>
            <h1 className="text-xl md:text-2xl font-bold font-headline text-primary cursor-pointer">
              Paani Delivery System
            </h1>
        </Link>
        <div className="flex items-center gap-3 md:gap-4">
            <Popover open={isNotificationPopoverOpen} onOpenChange={handleOpenNotificationPopover}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                      {unreadNotificationCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 glass-card">
                 <div className="p-4 border-b border-[hsl(var(--border))]/50"><h4 className="font-medium text-sm text-foreground">Notifications</h4></div>
                 {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
                 ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.map(notification => (
                            <NotificationItem key={notification.notificationId} notification={notification} />
                        ))}
                    </div>
                 )}
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
        </div>
      </div>
      
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Customers</CardTitle><Users className="h-5 w-5 text-muted-foreground" /></CardHeader>
            <CardContent>{totalCustomers >= 0 ? <div className="text-2xl font-bold">{totalCustomers}</div> : <Skeleton className="h-7 w-12 bg-muted/50" />}</CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle><ListChecks className="h-5 w-5 text-muted-foreground" /></CardHeader>
            <CardContent>{pendingDeliveries >= 0 ? <div className="text-2xl font-bold">{pendingDeliveries}</div> : <Skeleton className="h-7 w-12 bg-muted/50" />}</CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Deliveries Today</CardTitle><PackageCheck className="h-5 w-5 text-muted-foreground" /></CardHeader>
            <CardContent>{deliveriesTodayCount >= 0 ? <div className="text-2xl font-bold">{deliveriesTodayCount}</div> : <Skeleton className="h-7 w-12 bg-muted/50" />}</CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cans Delivered Today</CardTitle><PackageSearch className="h-5 w-5 text-muted-foreground" /></CardHeader>
            <CardContent>{totalCansToday >= 0 ? <div className="text-2xl font-bold">{totalCansToday}</div> : <Skeleton className="h-7 w-12 bg-muted/50" />}</CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <section>
            <Card className="glass-card">
              <CardHeader>
                 <div className="flex justify-between items-center"><CardTitle>Delivery Request Dashboard</CardTitle></div>
                <CardDescription>Search for requests or find customers to create new requests.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                 <DeliveryRequestList 
                    onInitiateNewRequest={(customer) => openRequestDialog(undefined, customer)}
                    onEditRequest={(request) => openRequestDialog(request)}
                 />
              </CardContent>
            </Card>
          </section>
          
          <Accordion type="single" collapsible className="w-full" defaultValue="">
            <AccordionItem value="customer-management" className="border-none">
              <AccordionTrigger className="text-2xl font-semibold font-headline py-4 hover:no-underline text-foreground/90 [&[data-state=open]]:text-primary">
                Customer Management
              </AccordionTrigger>
              <AccordionContent>
                <Card className="glass-card">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Customer Records</CardTitle>
                        <Button variant="default" onClick={handleAddNewCustomer}>
                            <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
                        </Button>
                    </div>
                    <CardDescription>View, search, and manage customer profiles.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <CustomerList onEditCustomer={handleEditCustomer} />
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

            {/* Dialog for Adding/Editing Customer */}
            <Dialog open={isCustomerFormDialogOpen} onOpenChange={setIsCustomerFormDialogOpen}>
                <DialogContent className="sm:max-w-[525px] flex flex-col max-h-[calc(100vh-4rem)] glass-card">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle>{customerToEdit ? `Edit Customer: ${customerToEdit.name}` : 'Add New Customer'}</DialogTitle>
                        <DialogDescription>
                            {customerToEdit ? 'Update the customer details below.' : 'Fill in the details below to add a new customer.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto pr-2 py-2">
                        <CustomerForm 
                            editingCustomer={customerToEdit}
                            onSuccess={() => setIsCustomerFormDialogOpen(false)} 
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog for Creating/Editing Delivery Request */}
            <Dialog open={isRequestDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) closeRequestDialog(); else setIsRequestDialogOpen(true);
            }}>
                <DialogContent className="sm:max-w-[525px] flex flex-col max-h-[calc(100vh-4rem)] glass-card">
                    <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                        {editingRequestData ? `Edit Request for ${editingRequestData.customerName}` : (customerToPreselectForRequest ? `Create Request for ${customerToPreselectForRequest.name}` : "Create New Delivery Request")}
                    </DialogTitle>
                    <DialogDescription>
                        {editingRequestData ? "Modify the details below, or cancel the request." : "Fill in the details below to create a new delivery request."}
                    </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto pr-2 py-2">
                        <CreateDeliveryRequestForm 
                            onSuccess={closeRequestDialog}
                            onCloseDialog={closeRequestDialog} 
                            customerToPreselect={customerToPreselectForRequest}
                            editingRequest={editingRequestData}
                        />
                    </div>
                </DialogContent>
            </Dialog>

          <section>
            <h3 className="text-2xl font-semibold mb-4 font-headline text-foreground/90">System Settings</h3>
            <Card className="glass-card">
              <CardHeader><CardTitle>System Configuration</CardTitle><CardDescription>Manage admin accounts and system-wide settings.</CardDescription></CardHeader>
              <CardContent className="p-6">
                 <p className="text-muted-foreground mb-4">Admin user management functionality removed. Users are managed via Firebase Console.</p>
                <Button variant="outline" className="mt-4" disabled><Settings className="mr-2 h-4 w-4" />Configure (Soon)</Button>
              </CardContent>
            </Card>
          </section>
        </div>
        <div className="mt-12 text-center">
            <Link href="/staff" passHref><Button variant="ghost" className="text-sm hover:text-accent">Go to Staff App</Button></Link>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground bg-background/30 border-t border-[hsl(var(--border))]/20 mt-auto">
        Paani Delivery System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
    
