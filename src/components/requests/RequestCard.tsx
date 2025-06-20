
import type React from 'react';
import type { DeliveryRequest } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, CheckCircle2, CalendarDays, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RequestCardProps {
  request: DeliveryRequest;
  onMarkAsDone: (requestId: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onMarkAsDone }) => {
  const isEmergency = request.priority === 'emergency';
  const isSindhiName = /[ء-ي]/.test(request.customerName); 

  // Check for 'pending' or 'pending_confirmation' status
  const isPending = request.status === 'pending' || request.status === 'pending_confirmation';

  const cardClasses = cn(
    'shadow-lg transition-all duration-300 ease-in-out',
    request.status === 'delivered' ? 'opacity-70 border-green-500' : 'border-primary',
    isEmergency && isPending ? 'border-destructive border-2' : ''
  );
  
  const customerNameClasses = cn(
    'font-headline',
    isSindhiName ? 'font-sindhi rtl' : 'ltr' 
  );

  return (
    <Card className={cardClasses}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={customerNameClasses}>
            {request.customerName}
          </CardTitle>
          {isPending ? (
            <Truck className={cn("h-6 w-6", isEmergency ? "text-destructive" : "text-primary")} />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          )}
        </div>
        <CardDescription>{request.address}</CardDescription>
        {isEmergency && isPending && (
          <Badge variant="destructive" className="mt-1 w-fit">
            <AlertTriangle className="h-3 w-3 mr-1" />
            EMERGENCY
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-1">Order Details:</p>
        <p className="text-sm mb-3">
          {request.orderDetails ? `${request.orderDetails} - ` : ''}
          <span className="font-bold text-lg">{request.cans}</span> cans
        </p>
        <div className="flex items-center text-xs text-muted-foreground mb-1">
          <CalendarDays className="h-4 w-4 mr-2" />
          Requested: {request.requestedAt ? format(new Date(request.requestedAt), 'MMM d, yyyy HH:mm') : '-'}
        </div>
        {request.completedAt && (
          <div className="flex items-center text-xs text-green-600">
            <Check className="h-4 w-4 mr-2" />
            Completed: {format(new Date(request.completedAt), 'MMM d, yyyy HH:mm')}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isPending && (
          <Button 
            onClick={() => onMarkAsDone(request.requestId)}
            className="w-full bg-accent hover:bg-opacity-90 text-accent-foreground"
            aria-label={`Mark order for ${request.customerName} as done`}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Delivered
          </Button>
        )}
        {request.status === 'delivered' && (
           <p className="text-sm text-green-600 font-medium w-full text-center">Delivery Fulfilled</p>
        )}
      </CardFooter>
    </Card>
  );
};

export default RequestCard;
