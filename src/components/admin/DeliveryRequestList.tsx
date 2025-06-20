
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import type { Customer, DeliveryRequest } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertTriangle, PlusCircle, Pencil, CheckCircle, XCircle, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface DeliveryRequestListProps {
  onInitiateNewRequest: (customer: Customer) => void;
  onEditRequest: (request: DeliveryRequest) => void;
}

const DeliveryRequestList: React.FC<DeliveryRequestListProps> = ({ onInitiateNewRequest, onEditRequest }) => {
  const [allRequests, setAllRequests] = useState<DeliveryRequest[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();


  useEffect(() => {
    setIsLoadingRequests(true);
    const requestsCollectionRef = collection(db, 'deliveryRequests');
    // Order by status (pending first), then priority (emergency first), then by most recent request
    const q_requests = query(
      requestsCollectionRef,
      orderBy('status', 'asc'), 
      orderBy('priority', 'desc'),
      orderBy('requestedAt', 'desc') 
    );

    const unsubscribeRequests = onSnapshot(q_requests, (querySnapshot) => {
      const requestsData: DeliveryRequest[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Keep cancelled requests in the list for sorting and display
        requestsData.push({
          requestId: docSnapshot.id,
          ...data,
          requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(data.requestedAt),
          scheduledFor: data.scheduledFor instanceof Timestamp ? data.scheduledFor.toDate() : (data.scheduledFor ? new Date(data.scheduledFor) : undefined),
          deliveredAt: data.deliveredAt instanceof Timestamp ? data.deliveredAt.toDate() : (data.deliveredAt ? new Date(data.deliveredAt) : undefined),
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : undefined),
        } as DeliveryRequest);
      });
      setAllRequests(requestsData);
      setIsLoadingRequests(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching delivery requests:", err);
      setError("Failed to fetch delivery requests. Please check console for details.");
      setIsLoadingRequests(false);
    });

    setIsLoadingCustomers(true);
    const customersCollectionRef = collection(db, 'customers');
    const q_customers = query(customersCollectionRef, orderBy('name', 'asc'));
    const unsubscribeCustomers = onSnapshot(q_customers, (querySnapshot) => {
        const customersData: Customer[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            customersData.push({
            customerId: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
            } as Customer);
        });
        setAllCustomers(customersData);
        setIsLoadingCustomers(false);
    }, (err) => {
        console.error("Error fetching customers:", err);
        setIsLoadingCustomers(false);
    });


    return () => {
        unsubscribeRequests();
        unsubscribeCustomers();
    };
  }, []);

  const processedRequests = useMemo(() => {
    // Client-side sort to ensure 'pending' and 'pending_confirmation' are on top,
    // then 'delivered', then 'cancelled'. Within these groups, rely on Firestore's 'requestedAt' (desc)
    // and 'priority' (desc for emergencies within pending).
    return [...allRequests].sort((a, b) => {
        const statusOrderValue = (status: DeliveryRequest['status']) => {
            if (status === 'pending_confirmation') return 0; // Emergency might make this appear above regular pending
            if (status === 'pending') return 1;
            if (status === 'delivered') return 2;
            if (status === 'cancelled') return 3;
            return 4; 
        };

        const orderA = statusOrderValue(a.status);
        const orderB = statusOrderValue(b.status);

        if (orderA !== orderB) return orderA - orderB;

        // Within the same status group, if it's an active request, prioritize emergency
        if (a.status === 'pending' || a.status === 'pending_confirmation') {
            if (a.priority === 'emergency' && b.priority !== 'emergency') return -1;
            if (a.priority !== 'emergency' && b.priority === 'emergency') return 1;
        }
        
        // If statuses and (for active) priorities are the same, rely on Firestore's requestedAt (desc)
        // This means timeB - timeA to keep recent on top.
        const timeA = new Date(a.requestedAt).getTime();
        const timeB = new Date(b.requestedAt).getTime();
        return timeB - timeA;
    });
  }, [allRequests]);


  const filteredDeliveryRequests = useMemo(() => {
    if (!searchTerm) {
      return processedRequests;
    }
    return processedRequests.filter(request => {
      const term = searchTerm.toLowerCase();
      // Change 'planned' to 'pending' for search matching as well
      const statusDisplay = request.status === 'pending' ? 'pending' : request.status;
      return (
        request.customerName.toLowerCase().includes(term) ||
        request.address.toLowerCase().includes(term) ||
        statusDisplay.toLowerCase().includes(term) ||
        request.priority.toLowerCase().includes(term) ||
        (request.orderDetails && request.orderDetails.toLowerCase().includes(term))
      );
    });
  }, [processedRequests, searchTerm]);

  const customersForNewRequest = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const lowerSearchTerm = searchTerm.toLowerCase();
    const customersWithActiveRequests = new Set(
      allRequests
        .filter(req => req.status === 'pending' || req.status === 'pending_confirmation')
        .map(req => req.customerId)
    );

    return allCustomers
      .filter(customer =>
        (customer.name.toLowerCase().includes(lowerSearchTerm) ||
         (customer.phone && customer.phone.includes(lowerSearchTerm)) ||
         customer.address.toLowerCase().includes(lowerSearchTerm)
        ) && !customersWithActiveRequests.has(customer.customerId)
      )
      .slice(0, 5); 
  }, [allCustomers, allRequests, searchTerm]);


  const getStatusBadgeVariant = (status: DeliveryRequest['status']) => {
    switch (status) {
      case 'pending': return 'default'; 
      case 'pending_confirmation': return 'secondary';
      case 'delivered': return 'outline'; 
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

   const getPriorityIcon = (priority: DeliveryRequest['priority']) => {
    if (priority === 'emergency') {
      return <AlertTriangle className="h-4 w-4 text-destructive inline-block mr-1" />;
    }
    return null;
  };

  // Display "Pending" instead of "planned"
  const getStatusDisplay = (status: DeliveryRequest['status']) => {
    if (status === 'pending') return 'Pending';
    return status.replace('_', ' ');
  }
  
  const getStatusIcon = (status: DeliveryRequest['status']) => {
    if (status === 'delivered') return <CheckCircle className="h-4 w-4 text-green-600 inline-block mr-1" />;
    if (status === 'cancelled') return <XCircle className="h-4 w-4 text-destructive inline-block mr-1" />;
    return null;
  }

  const isLoading = isLoadingRequests || isLoadingCustomers;

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        <Skeleton className="h-10 w-full md:w-1/2 lg:w-1/3" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
            <div className="space-y-1 flex-grow">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive mt-4 text-center">{error}</p>;
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search requests or find customers for new request..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full "
        />
      </div>

      {/* Customer suggestions for new request on TOP */}
      {searchTerm && customersForNewRequest.length > 0 && (
          <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3">Create New Request for:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customersForNewRequest.map(customer => (
                  <Card key={customer.customerId} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex justify-between items-center">
                          <div>
                              <p className={cn("font-medium", /[ء-ي]/.test(customer.name) ? 'font-sindhi rtl' : 'ltr')}>{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.address}</p>
                          </div>
                          <Button size="sm" onClick={() => onInitiateNewRequest(customer)}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Create Request
                          </Button>
                      </CardContent>
                  </Card>
              ))}
              </div>
          </div>
      )}

      {filteredDeliveryRequests.length === 0 && !searchTerm && (
         <p className="text-muted-foreground mt-4 text-center">No delivery requests. Use search to find customers for new requests.</p>
      )}
      {filteredDeliveryRequests.length === 0 && searchTerm && customersForNewRequest.length === 0 && (
         <p className="text-muted-foreground mt-4 text-center">No requests or customers found matching "{searchTerm}".</p>
      )}

      {filteredDeliveryRequests.length > 0 && (
        <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-center">Cans</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveryRequests.map((request) => {
                const isSindhiName = /[ء-ي]/.test(request.customerName);
                const nameClasses = cn(isSindhiName ? 'font-sindhi rtl' : 'ltr');
                const isCancelled = request.status === 'cancelled';
                const isDelivered = request.status === 'delivered';
                const rowClasses = cn(
                    isCancelled ? 'opacity-60 bg-muted/30' : '',
                    isDelivered ? 'bg-green-500/10' : ''
                );
                
                // Requests can be edited if they are not delivered or cancelled.
                // const canBeEdited = request.status !== 'delivered' && request.status !== 'cancelled';
                // All requests can be "edited" to view details or potentially cancel if pending/pending_confirmation.
                // The form itself will handle if cancellation is possible.

                return (
                  <TableRow key={request.requestId} className={rowClasses}>
                    <TableCell className={cn(nameClasses, isCancelled && 'line-through')}>
                        {request.customerName}
                    </TableCell>
                    <TableCell className={cn("whitespace-normal break-words max-w-xs", isCancelled && 'line-through')}>
                        {request.address}
                    </TableCell>
                    <TableCell className={cn("text-center", isCancelled && 'line-through')}>{request.cans}</TableCell>
                    <TableCell className={isCancelled ? 'line-through' : ''}>
                      {getPriorityIcon(request.priority)}
                      <span className="capitalize">{request.priority}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(request.status)} className="capitalize">
                        {getStatusIcon(request.status)}
                        {getStatusDisplay(request.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className={isCancelled ? 'line-through' : ''}>
                      {request.requestedAt ? format(new Date(request.requestedAt), 'MMM d, HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                       {/* Always show Edit button, form will handle context (new/edit/cancel) */}
                        <Button variant="ghost" size="icon" title="Edit/View Request" onClick={() => onEditRequest(request)}>
                            <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DeliveryRequestList;
