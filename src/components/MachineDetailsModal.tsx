import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Cpu, Building2, MapPin, Calendar, Activity, Zap } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface MachineDetailsModalProps {
  machine: (Tables<'machines'> & { franchises?: { name: string } | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineDetailsModal({ machine, open, onOpenChange }: MachineDetailsModalProps) {
  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
              <Cpu className="h-5 w-5 text-accent-foreground" />
            </div>
            {machine.machine_name}
            <Badge variant="default" className="bg-success text-success-foreground">
              Active
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Machine Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Machine Name</span>
                <p className="font-medium">{machine.machine_name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Machine Number</span>
                <p className="font-medium">{machine.machine_number}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">ESP ID</span>
                <p className="font-medium">{machine.esp_id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Installation Date</span>
                <p className="font-medium">{formatDate(machine.installation_date)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location & Franchise */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Location & Franchise
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Franchise</span>
                <p className="font-medium">{machine.franchises?.name || 'No Franchise Assigned'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Branch Location</span>
                <p className="font-medium">{machine.branch_location}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Counter Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Counter Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Initial Coin Counter</span>
                </div>
                <p className="text-2xl font-bold text-primary">{machine.initial_coin_counter.toLocaleString()}</p>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Initial Prize Counter</span>
                </div>
                <p className="text-2xl font-bold text-accent">{machine.initial_prize_counter.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">{formatDate(machine.created_at || '')}</p>
              </div>
              
              {machine.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="font-medium bg-secondary/30 rounded-lg p-3 mt-1">{machine.notes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Performance Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-warning">--</div>
                <div className="text-sm text-muted-foreground">Current Coins</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-warning">--</div>
                <div className="text-sm text-muted-foreground">Current Prizes</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-warning">--</div>
                <div className="text-sm text-muted-foreground">Monthly Revenue</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              * Current performance data will be available once counter readings are recorded
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}