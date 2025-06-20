
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import type { Customer } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Removed AvatarImage
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle2, Search, Pencil } from 'lucide-react'; // Added Pencil
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; // Added Button

interface CustomerListProps {
  onEditCustomer?: (customer: Customer) => void; // Optional for now, will be used by AdminDashboardPage
}

const CustomerList: React.FC<CustomerListProps> = ({ onEditCustomer }) => {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const customersCollectionRef = collection(db, 'customers');
    const q = query(customersCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching customers:", err);
      setError("Failed to fetch customers. Please check console for details.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return allCustomers;
    }
    return allCustomers.filter(customer => {
      const term = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(term) ||
        (customer.phone && customer.phone.toLowerCase().includes(term)) ||
        customer.address.toLowerCase().includes(term)
      );
    });
  }, [allCustomers, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        <Skeleton className="h-10 w-1/3" /> 
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-2 border rounded-md">
            <Skeleton className="h-10 w-10 rounded-full" />
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
    <div className="mt-4">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search customers by name, phone, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:w-1/2 lg:w-1/3"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-center">
          {searchTerm ? `No customers found matching "${searchTerm}".` : "No customers found."}
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-center">Default Cans</TableHead>
                <TableHead className="text-right">Actions</TableHead> 
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const isSindhiName = /[ء-ي]/.test(customer.name);
                const nameClasses = cn(isSindhiName ? 'font-sindhi rtl' : 'ltr');
                const initials = customer.name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
                return (
                  <TableRow key={customer.customerId}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        {/* Removed AvatarImage as profilePictureUrl is removed */}
                        <AvatarFallback>
                          {initials.substring(0,2)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className={nameClasses}>{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell className="whitespace-normal break-words max-w-xs">{customer.address}</TableCell>
                    <TableCell className="text-center">{customer.defaultCans}</TableCell>
                    <TableCell className="text-right">
                      {onEditCustomer && (
                        <Button variant="ghost" size="icon" onClick={() => onEditCustomer(customer)} title="Edit Customer">
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
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

export default CustomerList;
    
