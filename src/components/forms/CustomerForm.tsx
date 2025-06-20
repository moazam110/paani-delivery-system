
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getCountFromServer, getDocs, sum } from 'firebase/firestore';
import type { Customer } from '@/types'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Schema without profilePicture
const customerFormSchema = z.object({
  name: z.string().min(1, { message: "Customer name is required." }),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address is required." }),
  defaultCans: z.coerce.number().min(0, { message: "Default cans cannot be negative." }).default(1),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  editingCustomer?: Customer | null;
  onSuccess?: () => void;
}

export default function CustomerForm({ editingCustomer, onSuccess }: CustomerFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameManuallySetRtl, setNameManuallySetRtl] = useState(false);
  const isEditMode = !!editingCustomer;

  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [totalCansReceived, setTotalCansReceived] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      defaultCans: 1,
      notes: "",
    },
  });

  useEffect(() => {
    if (isEditMode && editingCustomer) {
      form.reset({
        name: editingCustomer.name,
        phone: editingCustomer.phone || "",
        address: editingCustomer.address,
        defaultCans: editingCustomer.defaultCans,
        notes: editingCustomer.notes || "",
      });

      const fetchCustomerStats = async () => {
        if (!editingCustomer.customerId) return;
        setIsLoadingStats(true);
        try {
          // Fetch total orders
          const requestsQuery = query(collection(db, 'deliveryRequests'), where('customerId', '==', editingCustomer.customerId));
          const requestsSnapshot = await getCountFromServer(requestsQuery);
          setTotalOrders(requestsSnapshot.data().count);

          // Fetch total cans from delivered requests
          const deliveredRequestsQuery = query(
            collection(db, 'deliveryRequests'), 
            where('customerId', '==', editingCustomer.customerId),
            where('status', '==', 'delivered')
          );
          const deliveredRequestsDocs = await getDocs(deliveredRequestsQuery);
          let cansSum = 0;
          deliveredRequestsDocs.forEach(doc => {
            cansSum += doc.data().cans || 0;
          });
          setTotalCansReceived(cansSum);

        } catch (error) {
          console.error("Error fetching customer stats:", error);
          toast({ variant: "destructive", title: "Failed to load customer stats." });
        } finally {
          setIsLoadingStats(false);
        }
      };
      fetchCustomerStats();

    } else {
      form.reset({
        name: "",
        phone: "",
        address: "",
        defaultCans: 1,
        notes: "",
      });
      setTotalOrders(null);
      setTotalCansReceived(null);
    }
  }, [editingCustomer, form, isEditMode, toast]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    form.setValue("name", value);
    if (/[ء-ي]/.test(value) && !nameManuallySetRtl) {
      event.target.dir = 'rtl';
    } else if (!nameManuallySetRtl) {
      event.target.dir = 'ltr';
    }
  };

  const handleNameDirectionToggle = () => {
    const nameInput = document.getElementById('customerName') as HTMLInputElement;
    if (nameInput) {
      nameInput.dir = nameInput.dir === 'rtl' ? 'ltr' : 'rtl';
      setNameManuallySetRtl(true);
    }
  };

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);

    try {
      const customerDataToSave: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt' | 'profilePictureUrl'> = { // profilePictureUrl removed here too
        name: data.name,
        phone: data.phone || "",
        address: data.address,
        defaultCans: data.defaultCans,
        notes: data.notes || "",
      };

      if (isEditMode && editingCustomer?.customerId) {
        const customerDocRef = doc(db, "customers", editingCustomer.customerId);
        await updateDoc(customerDocRef, {
          ...customerDataToSave,
          updatedAt: serverTimestamp(),
        });
        
      } else {
        await addDoc(collection(db, "customers"), {
          ...customerDataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      
      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} customer:`, error);
      toast({
        variant: "destructive",
        title: `Failed to ${isEditMode ? 'Update' : 'Add'} Customer`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4"> {/* Reduced space-y from 6 to 4 */}
        
        {isEditMode && (
          <Card className="mb-4 bg-muted/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base">Customer Stats</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-sm space-y-1">
              {isLoadingStats ? (
                <>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </>
              ) : (
                <>
                  <p>Total Orders: <span className="font-semibold">{totalOrders ?? 'N/A'}</span></p>
                  <p>Total Cans Received: <span className="font-semibold">{totalCansReceived ?? 'N/A'}</span></p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    id="customerName"
                    placeholder="e.g., محمد علي or John Doe"
                    {...field}
                    onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e);
                    }}
                    className="font-sindhi"
                  />
                </FormControl>
                <Button type="button" variant="outline" size="sm" onClick={handleNameDirectionToggle} className="px-2 py-1 text-xs">
                  Toggle RTL
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="e.g., +923001234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Full address for delivery" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Profile Picture Field Removed */}

        <FormField
          control={form.control}
          name="defaultCans"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Number of Cans</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any special instructions or notes about the customer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Customer" : "Add Customer")}
        </Button>
      </form>
    </Form>
  );
}
