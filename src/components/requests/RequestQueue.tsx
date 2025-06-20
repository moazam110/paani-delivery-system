
import type React from 'react';
import type { DeliveryRequest } from '@/types';
import RequestCard from './RequestCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ListFilter, ListChecks } from 'lucide-react';

interface RequestQueueProps {
  requests: DeliveryRequest[];
  onMarkAsDone: (requestId: string) => void;
}

const RequestQueue: React.FC<RequestQueueProps> = ({ requests, onMarkAsDone }) => {
  const pendingRequests = requests // Changed from plannedRequests
    .filter(req => req.status === 'pending' || req.status === 'pending_confirmation') // Changed from 'planned'
    .sort((a, b) => {
      if (a.priority === 'emergency' && b.priority !== 'emergency') return -1;
      if (a.priority !== 'emergency' && b.priority === 'emergency') return 1;
      // Ensure dates are properly compared; assuming they are Date objects or numbers
      const timeA = a.requestedAt instanceof Date ? a.requestedAt.getTime() : (typeof a.requestedAt === 'number' ? a.requestedAt : 0);
      const timeB = b.requestedAt instanceof Date ? b.requestedAt.getTime() : (typeof b.requestedAt === 'number' ? b.requestedAt : 0);
      return timeA - timeB; // Oldest first
    });

  const deliveredRequests = requests
    .filter(req => req.status === 'delivered')
    // Ensure dates are properly compared for sorting completedAt
    .sort((a, b) => {
        const timeA = a.completedAt instanceof Date ? a.completedAt.getTime() : (typeof a.completedAt === 'number' ? a.completedAt : 0);
        const timeB = b.completedAt instanceof Date ? b.completedAt.getTime() : (typeof b.completedAt === 'number' ? b.completedAt : 0);
        return timeB - timeA; // Newest completed first
    });


  return (
    <div className="p-4 md:p-8 space-y-6">
      <Accordion type="multiple" defaultValue={['pending-requests', 'delivered-requests']} className="w-full">
        <AccordionItem value="pending-requests">
          <AccordionTrigger className="text-xl font-headline hover:no-underline">
            <div className="flex items-center">
              <ListFilter className="h-6 w-6 mr-3 text-primary" />
              Pending Requests ({pendingRequests.length}) 
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {pendingRequests.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-4">
                {pendingRequests.map(request => (
                  <RequestCard key={request.requestId} request={request} onMarkAsDone={onMarkAsDone} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No pending delivery requests.</p>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="delivered-requests">
          <AccordionTrigger className="text-xl font-headline hover:no-underline">
            <div className="flex items-center">
              <ListChecks className="h-6 w-6 mr-3 text-green-600" />
              Delivered Requests ({deliveredRequests.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {deliveredRequests.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-4">
                {deliveredRequests.map(request => (
                  <RequestCard key={request.requestId} request={request} onMarkAsDone={onMarkAsDone} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No delivered delivery requests yet.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default RequestQueue;
