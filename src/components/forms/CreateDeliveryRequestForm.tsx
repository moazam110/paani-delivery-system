
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle, Ban } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import type { Customer, DeliveryRequest } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const createDeliveryRequestSchema = z.object({
  cans: z.coerce.number().min(1, { message: "Number of cans must be at least 1." }),
  orderDetails: z.string().optional(),
  priority: z.enum(['normal', 'emergency'], { required_error: "Priority is required." }),
});

type CreateDeliveryRequestFormValues = z.infer<typeof createDeliveryRequestSchema>;

interface CreateDeliveryRequestFormProps {
  onSuccess?: () => void;
  onCloseDialog?: () => void; 
  customerToPreselect?: Customer | null;
  editingRequest?: DeliveryRequest | null;
}

export default function CreateDeliveryRequestForm({
  onSuccess,
  onCloseDialog,
  customerToPreselect,
  editingRequest,
}: CreateDeliveryRequestFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isCancelConfirmationOpen, setIsCancelConfirmationOpen] = useState(false);

  const isEditMode = !!editingRequest;
  // A request can be cancelled if it's in 'edit mode' AND its status is 'pending' or 'pending_confirmation'
  const canCancelRequest = isEditMode && editingRequest && (editingRequest.status === 'pending' || editingRequest.status === 'pending_confirmation');


  const form = useForm<CreateDeliveryRequestFormValues>({
    resolver: zodResolver(createDeliveryRequestSchema),
    defaultValues: {
      cans: editingRequest?.cans || customerToPreselect?.defaultCans || 1,
      orderDetails: editingRequest?.orderDetails || "",
      priority: editingRequest?.priority || "normal",
    },
  });

  useEffect(() => {
    if (editingRequest) {
      const customerForEdit: Customer = {
        customerId: editingRequest.customerId,
        name: editingRequest.customerName,
        address: editingRequest.address,
        defaultCans: editingRequest.cans, 
        createdAt: '', 
        updatedAt: '', 
      };
      setSelectedCustomer(customerForEdit);
      form.reset({
        cans: editingRequest.cans,
        orderDetails: editingRequest.orderDetails || "",
        priority: editingRequest.priority,
      });
      setIsLoadingCustomers(false);
    } else if (customerToPreselect) {
      setSelectedCustomer(customerToPreselect);
      form.reset({
        cans: customerToPreselect.defaultCans || 1,
        orderDetails: "",
        priority: "normal",
      });
      setIsLoadingCustomers(false);
    } else {
      const fetchCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
          const customersCollectionRef = collection(db, 'customers');
          const q_customers = query(customersCollectionRef, orderBy('name', 'asc'));
          const querySnapshot = await getDocs(q_customers);
          const customersData = querySnapshot.docs.map(doc => ({
            customerId: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
            updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt),
          } as Customer));
          setAllCustomers(customersData);
        } catch (error) {
          console.error("Error fetching customers:", error);
          toast({
            variant: "destructive",
            title: "Failed to load customers",
            description: "Could not fetch customer list for selection.",
          });
        } finally {
          setIsLoadingCustomers(false);
        }
      };
      fetchCustomers();
      form.reset({ cans: 1, orderDetails: "", priority: "normal" });
      setSelectedCustomer(null);
    }
  }, [toast, form, customerToPreselect, editingRequest]);


  const filteredCustomers = useMemo(() => {
    if (isEditMode || customerToPreselect) return []; 
    if (!searchTerm.trim()) return [];
    return allCustomers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      customer.address.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [allCustomers, searchTerm, customerToPreselect, isEditMode]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue("cans", customer.defaultCans || 1);
    setSearchTerm('');
  };

  const onSubmit = async (data: CreateDeliveryRequestFormValues) => {
    if (!selectedCustomer && !isEditMode) { 
      toast({
        variant: "destructive",
        title: "No Customer Selected",
        description: "Please search and select a customer.",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      if (isEditMode && editingRequest) {
        const requestDocRef = doc(db, 'deliveryRequests', editingRequest.requestId);
        await updateDoc(requestDocRef, {
          ...data, 
          status: 'pending', // If editing, it becomes/stays 'pending'
          updatedAt: serverTimestamp(),
        });
      } else if (selectedCustomer) {
        const deliveryRequestData: Omit<DeliveryRequest, 'requestId' | 'requestedAt' | 'status' | 'updatedAt' | 'createdAt' | 'internalNotes'> = {
          customerId: selectedCustomer.customerId,
          customerName: selectedCustomer.name,
          address: selectedCustomer.address,
          cans: data.cans,
          orderDetails: data.orderDetails || "",
          priority: data.priority,
        };
        await addDoc(collection(db, "deliveryRequests"), {
          ...deliveryRequestData,
          status: 'pending', // New requests are 'pending'
          requestedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      form.reset({ cans: 1, orderDetails: "", priority: "normal" });
      if (!customerToPreselect && !isEditMode) {
         setSelectedCustomer(null);
      }
      setSearchTerm('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error saving delivery request:", error);
      toast({
        variant: "destructive",
        title: `Failed to ${isEditMode ? 'Update' : 'Create'} Request`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkRequestAsCancelled = async () => {
    if (!editingRequest) return; // Should not happen if button is shown correctly
    setIsSubmitting(true);
    try {
      const requestDocRef = doc(db, 'deliveryRequests', editingRequest.requestId);
      await updateDoc(requestDocRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
        // No notification needed here as per user request to revert that
      });
      setIsCancelConfirmationOpen(false);
      // Do not show success toast for cancellation
      if (onSuccess) { 
        onSuccess();
      }
    } catch (err) {
      console.error("Error cancelling request:", err);
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: "Could not cancel the request.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!selectedCustomer && !customerToPreselect && !isEditMode ? (
          <div className="space-y-3">
            <FormLabel htmlFor="customerSearch">Search Customer</FormLabel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="customerSearch"
                placeholder="Search by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoadingCustomers || isSubmitting}
              />
            </div>
            {isLoadingCustomers && <p className="text-sm text-muted-foreground">Loading customers...</p>}
            {searchTerm && !isLoadingCustomers && filteredCustomers.length === 0 && (
              <p className="text-sm text-muted-foreground">No customers found matching "{searchTerm}".</p>
            )}
            {filteredCustomers.length > 0 && (
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2 space-y-1">
                  {filteredCustomers.map(customer => {
                    const isSindhiName = /[ء-ي]/.test(customer.name);
                    const nameClasses = cn("font-medium", isSindhiName ? 'font-sindhi rtl' : 'ltr');
                    return (
                      <Button
                        key={customer.customerId}
                        type="button"
                        variant="ghost"
                        className="w-full justify-start h-auto p-2 text-left"
                        onClick={() => handleSelectCustomer(customer)}
                        disabled={isSubmitting}
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={customer.profilePictureUrl} alt={customer.name} data-ai-hint="person portrait"/>
                          <AvatarFallback>
                            <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={nameClasses}>{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.address}</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : selectedCustomer && (
          <Card>
            <CardHeader className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    {isEditMode ? "Editing Request for" : "Creating Request for"}
                  </CardTitle>
                  <p className={cn("font-semibold mt-1", /[ء-ي]/.test(selectedCustomer.name) ? 'font-sindhi rtl' : 'ltr')}>
                    {selectedCustomer.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                </div>
                {!customerToPreselect && !isEditMode && ( // Allow changing customer only in pure create mode from search
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                        setSelectedCustomer(null);
                        form.reset({ cans: 1, orderDetails: "", priority: "normal" }); // Reset form if customer is changed
                    }}
                    className="p-0 h-auto"
                    disabled={isSubmitting}
                  >
                    Change
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        )}

        <fieldset disabled={(!selectedCustomer && !isEditMode) || isSubmitting} className="space-y-6">
          <FormField
            control={form.control}
            name="cans"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Cans</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="orderDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Details / Customer Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Specific brand, leave at front door" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Priority</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="normal" />
                      </FormControl>
                      <FormLabel className="font-normal">Normal</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="emergency" />
                      </FormControl>
                      <FormLabel className="font-normal">Emergency</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
             {/* Cancel button for an existing request being edited (if eligible) */}
            {canCancelRequest && (
                <AlertDialog open={isCancelConfirmationOpen} onOpenChange={setIsCancelConfirmationOpen}>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" className="w-full sm:w-auto" disabled={isSubmitting}>
                            <Ban className="mr-2 h-4 w-4" />
                            Cancel This Delivery
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this delivery request for {editingRequest?.customerName}? This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsCancelConfirmationOpen(false)} disabled={isSubmitting}>Dismiss</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkRequestAsCancelled} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Yes, Cancel Delivery
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
             <Button type="button" variant="outline" onClick={onCloseDialog} className="w-full sm:w-auto" disabled={isSubmitting}>
                {isEditMode ? "Close" : "Cancel"} {/* "Cancel" for new request, "Close" if just viewing/editing */}
            </Button>
            <Button 
                type="submit" 
                className="w-full sm:w-auto" 
                disabled={(!selectedCustomer && !isEditMode) || isSubmitting}
            >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting 
                    ? (isEditMode ? "Updating..." : "Creating...") 
                    : (isEditMode ? "Update Request" : "Create Delivery Request")
                }
            </Button>
        </div>
      </form>
    </Form>
  );
}
