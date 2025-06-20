
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { db, storage } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Customer } from '@/types'; 

const addCustomerSchema = z.object({
  name: z.string().min(1, { message: "Customer name is required." }),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address is required." }),
  profilePicture: z.any().optional(), // Changed from z.instanceof(FileList)
  defaultCans: z.coerce.number().min(0, { message: "Default cans cannot be negative." }).default(1),
  notes: z.string().optional(),
});

type AddCustomerFormValues = z.infer<typeof addCustomerSchema>;

interface AddCustomerFormProps {
  onSuccess?: () => void;
}

export default function AddCustomerForm({ onSuccess }: AddCustomerFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameManuallySetRtl, setNameManuallySetRtl] = useState(false);

  const form = useForm<AddCustomerFormValues>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      profilePicture: undefined,
      defaultCans: 1,
      notes: "",
    },
  });

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

  const onSubmit = async (data: AddCustomerFormValues) => {
    setIsSubmitting(true);
    let profilePictureUrl = "";

    try {
      // data.profilePicture will be a FileList if a file was selected
      if (data.profilePicture && data.profilePicture.length > 0) {
        const file = data.profilePicture[0]; // Access the first file
        const storageRef = ref(storage, `customer_profile_pictures/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        profilePictureUrl = await getDownloadURL(snapshot.ref);
      }

      const customerData: Omit<Customer, 'customerId'> = {
        name: data.name,
        phone: data.phone || "",
        address: data.address,
        profilePictureUrl: profilePictureUrl,
        defaultCans: data.defaultCans,
        notes: data.notes || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "customers"), customerData);
      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error adding customer:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add Customer",
        description: error.message || "An unexpected error occurred while saving to Firebase.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        
        <FormField
          control={form.control}
          name="profilePicture"
          render={({ field }) => ( 
            <FormItem>
              <FormLabel>Profile Picture (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*" 
                  // react-hook-form expects the FileList or File object directly
                  // So we pass e.target.files (which is a FileList) to field.onChange
                  onChange={(e) => field.onChange(e.target.files)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          {isSubmitting ? "Adding Customer..." : "Add Customer"}
        </Button>
      </form>
    </Form>
  );
}
