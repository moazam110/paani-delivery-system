
import type React from 'react';
import type { DeliveryRequest } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hourglass, ListTodo } from 'lucide-react'; // Changed icon for total pending

interface StaffDashboardMetricsProps {
  requests: DeliveryRequest[]; // These are typically 'planned' or 'pending_confirmation' requests
}

const StaffDashboardMetrics: React.FC<StaffDashboardMetricsProps> = ({ requests }) => {
  const pendingForStaffCount = requests.length; // Since requests are pre-filtered for staff
  const emergencyCount = requests.filter(req => req.priority === 'emergency').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 p-4 md:p-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-headline">My Pending Deliveries</CardTitle>
          <ListTodo className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingForStaffCount}</div>
          <p className="text-xs text-muted-foreground">
            Total tasks assigned to you
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-lg bg-destructive/10 border-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-headline text-destructive">Emergency Tasks</CardTitle>
          <Hourglass className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{emergencyCount}</div>
          <p className="text-xs text-destructive/80">
            High priority deliveries
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffDashboardMetrics;

    
