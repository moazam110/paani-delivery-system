"use client";

import React from 'react';
import Header from '@/components/shared/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { UserCog, HardHat, LogIn } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background"> 
      <Header title="Water Delivery System" /> 
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--accent))]/5"> 
        <div className="container mx-auto text-center max-w-2xl">
            <Card className="glass-card p-6 md:p-10"> 
                <CardHeader>
                    <CardTitle className="text-4xl font-bold mb-4 font-headline text-primary">
                        Welcome to Water Delivery System
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground mb-8">
                        Efficient water delivery management for your business
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center p-4 border rounded-lg">
                            <UserCog className="mx-auto h-12 w-12 text-primary mb-3" />
                            <h3 className="font-semibold text-lg mb-2">Admin Portal</h3>
                            <p className="text-sm text-muted-foreground">
                                Manage customers, delivery requests, and system settings
                            </p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <HardHat className="mx-auto h-12 w-12 text-primary mb-3" />
                            <h3 className="font-semibold text-lg mb-2">Staff Portal</h3>
                            <p className="text-sm text-muted-foreground">
                                View and manage delivery assignments
                            </p>
                        </div>
                    </div>
                    
                    <Link href="/login" passHref>
                        <Button size="lg" className="w-full py-8 text-xl shadow-md hover:shadow-lg transition-shadow">
                            <LogIn className="mr-3 h-8 w-8" />
                            Sign In to Access System
                        </Button>
                    </Link>

                    <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                        <p className="font-medium mb-2">Demo Credentials:</p>
                        <p><strong>Admin:</strong> admin@waterdelivery.com / admin123</p>
                        <p><strong>Staff:</strong> staff@waterdelivery.com / staff123</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground bg-background/80"> 
        Water Delivery System &copy; {new Date().getFullYear()} 
      </footer>
    </div>
  );
}

