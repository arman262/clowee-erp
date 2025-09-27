import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Cpu, Calendar, FileText } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface CounterReadingDetailsModalProps {
  reading: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CounterReadingDetailsModal({ reading, open, onOpenChange }: CounterReadingDetailsModalProps) {
  if (!reading) return null;

  const isInitial = reading.type === 'initial';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isInitial ? 'bg-gradient-primary' : 'bg-gradient-accent'
            }`}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            {isInitial ? 'Initial Reading' : 'Counter Reading'}
            <Badge variant={isInitial ? 'default' : 'secondary'} className={isInitial ? 'bg-primary text-primary-foreground' : ''}>
              {isInitial ? 'Initial' : 'Reading'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Machine Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Machine Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Machine Name</span>
                <p className="font-medium">{reading.machines?.machine_name || 'Unknown Machine'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Machine Number</span>
                <p className="font-medium">{reading.machines?.machine_number || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Franchise</span>
                <p className="font-medium">{reading.machines?.franchises?.name || 'No Franchise'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Reading Date</span>
                <p className="font-medium">{formatDate(reading.reading_date)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Counter Values */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Counter Values
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Coin Counter</span>
                </div>
                <p className="text-2xl font-bold text-primary">{reading.coin_counter.toLocaleString()}</p>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Prize Counter</span>
                </div>
                <p className="text-2xl font-bold text-accent">{reading.prize_counter.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">
                  {isInitial ? 'Initial Reading (Installation)' : 'Regular Counter Reading'}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Notes</span>
                <p className="font-medium bg-secondary/30 rounded-lg p-3 mt-1">
                  {reading.notes || 'No notes available'}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">{formatDate(reading.created_at || reading.reading_date)}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}