"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, MapPin, Phone, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { DeliveryRequest, AuthUser } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { format, isToday } from 'date-fns';
import Link from 'next/link';

export default function StaffPage() {
  const router = useRouter();
  
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'today'>('pending');

  const loadData = () => {
    const requests = db.getDeliveryRequests();
    
    let filteredRequests = requests;
    if (filter === 'pending') {
      filteredRequests = requests.filter(r => 
        r.status === 'pending' || r.status === 'pending_confirmation'
      );
    } else if (filter === 'today') {
      filteredRequests = requests.filter(r => 
        isToday(r.requestedAt) || (r.scheduledFor && isToday(r.scheduledFor))
      );
    }
    
    // Sort by priority and date
    filteredRequests.sort((a, b) => {
      if (a.priority === 'emergency' && b.priority !== 'emergency') return -1;
      if (b.priority === 'emergency' && a.priority !== 'emergency') return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
    
    setDeliveryRequests(filteredRequests);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.role === 'staff') {
        setAuthUser(user);
        loadData();
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    loadData();
  }, [filter]);

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

  const handleMarkDelivered = (requestId: string, customerName: string) => {
    const updatedRequest = db.updateDeliveryRequest(requestId, {
      status: 'delivered',
      deliveredAt: new Date(),
      completedAt: new Date()
    });

    if (updatedRequest) {
      loadData();
      toast({
        title: "Delivery completed",
        description: `Successfully delivered to ${customerName}`,
      });
    }
  };

  const handleMarkPendingConfirmation = (requestId: string, customerName: string) => {
    const updatedRequest = db.updateDeliveryRequest(requestId, {
      status: 'pending_confirmation'
    });

    if (updatedRequest) {
      loadData();
      toast({
        title: "Status updated",
        description: `${customerName}'s request is pending confirmation`,
      });
    }
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

  const pendingCount = db.getDeliveryRequests().filter(r => 
    r.status === 'pending' || r.status === 'pending_confirmation'
  ).length;

  const todayCount = db.getDeliveryRequests().filter(r => 
    isToday(r.requestedAt) || (r.scheduledFor && isToday(r.scheduledFor))
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Staff Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {authUser.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Admin Panel
              </Button>
            </Link>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filter Buttons */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            onClick={() => setFilter('today')}
          >
            Today ({todayCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Requests
          </Button>
        </div>

        {/* Delivery Requests */}
        <div className="space-y-4">
          {deliveryRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  {filter === 'pending' && 'No pending deliveries at the moment.'}
                  {filter === 'today' && 'No deliveries scheduled for today.'}
                  {filter === 'all' && 'No delivery requests found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            deliveryRequests.map((request) => (
              <Card key={request.requestId} className={`${
                request.priority === 'emergency' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {request.customerName}
                        {request.priority === 'emergency' && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Emergency
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        {request.address}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      request.status === 'delivered' ? 'default' :
                      request.status === 'pending' ? 'secondary' :
                      request.status === 'pending_confirmation' ? 'outline' : 'destructive'
                    }>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Quantity</p>
                        <p className="text-muted-foreground">{request.cans} cans</p>
                      </div>
                      <div>
                        <p className="font-medium">Requested</p>
                        <p className="text-muted-foreground">
                          {format(request.requestedAt, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    
                    {request.orderDetails && (
                      <div>
                        <p className="font-medium text-sm">Order Details</p>
                        <p className="text-muted-foreground text-sm">{request.orderDetails}</p>
                      </div>
                    )}

                    {request.internalNotes && (
                      <div>
                        <p className="font-medium text-sm">Internal Notes</p>
                        <p className="text-muted-foreground text-sm">{request.internalNotes}</p>
                      </div>
                    )}

                    {request.scheduledFor && (
                      <div>
                        <p className="font-medium text-sm">Scheduled For</p>
                        <p className="text-muted-foreground text-sm">
                          {format(request.scheduledFor, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleMarkDelivered(request.requestId, request.customerName)}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark Delivered
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleMarkPendingConfirmation(request.requestId, request.customerName)}
                            className="flex-1"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Pending Confirmation
                          </Button>
                        </>
                      )}
                      
                      {request.status === 'pending_confirmation' && (
                        <Button
                          onClick={() => handleMarkDelivered(request.requestId, request.customerName)}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm Delivered
                        </Button>
                      )}

                      {request.status === 'delivered' && request.deliveredAt && (
                        <div className="text-sm text-muted-foreground">
                          Delivered on {format(request.deliveredAt, 'MMM d, yyyy h:mm a')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

