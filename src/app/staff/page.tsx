
"use client";

import React, { useState, useEffect } from 'react';
import type { DeliveryRequest } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import Header from '@/components/shared/Header';
import StaffDashboardMetrics from '@/components/dashboard/StaffDashboardMetrics';
import RequestQueue from '@/components/requests/RequestQueue';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


export default function StaffPage() {
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const requestsCollectionRef = collection(db, 'deliveryRequests');
    const q = query(
        requestsCollectionRef, 
        where('status', 'in', ['pending', 'pending_confirmation']),
        orderBy('priority', 'desc'), 
        orderBy('requestedAt', 'asc')  
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const requestsData: DeliveryRequest[] = [];
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            requestsData.push({
                requestId: docSnapshot.id,
                ...data,
                requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(data.requestedAt),
                scheduledFor: data.scheduledFor instanceof Timestamp ? data.scheduledFor.toDate() : (data.scheduledFor ? new Date(data.scheduledFor) : undefined),
                deliveredAt: data.deliveredAt instanceof Timestamp ? data.deliveredAt.toDate() : (data.deliveredAt ? new Date(data.deliveredAt) : undefined),
                completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : undefined),
            } as DeliveryRequest);
        });
        setDeliveryRequests(requestsData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching staff delivery requests:", error);
        toast({
            variant: "destructive",
            title: "Error Fetching Requests",
            description: "Could not load delivery tasks. Please try again later.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleMarkAsDone = async (requestId: string) => {
    try {
        const requestDocRef = doc(db, 'deliveryRequests', requestId);
        await updateDoc(requestDocRef, {
            status: 'delivered',
            deliveredAt: serverTimestamp(), 
            completedAt: serverTimestamp() 
        });
        
        const completedRequest = deliveryRequests.find(req => req.requestId === requestId);
        if (completedRequest) {
            // No success toast
        }
    } catch (error) {
        console.error("Error marking request as done:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not mark the request as delivered. Please try again.",
        });
    }
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header title="Staff Delivery Interface" />
            <main className="flex-grow p-4 md:p-8">
                <Skeleton className="h-24 w-full mb-6 bg-muted/50" /> 
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="bg-card shadow-md">
                            <CardHeader><Skeleton className="h-6 w-3/4 bg-muted/50" /></CardHeader>
                            <CardContent><Skeleton className="h-16 w-full bg-muted/50" /></CardContent>
                        </Card>
                    ))}
                </div>
            </main>
            <footer className="text-center p-4 text-sm text-muted-foreground border-t border-[hsl(var(--border))]/30">
                Paani Delivery System Staff App &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header title="Staff Delivery Interface" />
      <main className="flex-grow">
        <StaffDashboardMetrics requests={deliveryRequests} /> 
        <RequestQueue requests={deliveryRequests} onMarkAsDone={handleMarkAsDone} />
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-[hsl(var(--border))]/30">
         Paani Delivery System Staff App &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

