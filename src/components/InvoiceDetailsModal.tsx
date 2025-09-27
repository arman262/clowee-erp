import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, DollarSign, Calendar, Building2, Cpu } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { formatDate } from "@/lib/dateUtils";

interface InvoiceDetailsModalProps {
  invoice: (Tables<'invoices'> & { 
    franchises?: { name: string } | null;
    machines?: { machine_name: string; machine_number: string } | null;
  }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailsModal({ invoice, open, onOpenChange }: InvoiceDetailsModalProps) {
  if (!invoice) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-success text-success-foreground';
      case 'Final':
        return 'bg-primary text-primary-foreground';
      case 'Draft':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            Invoice #{invoice.id.slice(0, 8)}
            <Badge className={getStatusColor(invoice.status || 'Draft')}>
              {invoice.status || 'Draft'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Invoice ID</span>
                <p className="font-medium">#{invoice.id.slice(0, 8)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Invoice Date</span>
                <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium">{invoice.status || 'Draft'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">{formatDate(invoice.created_at || '')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Franchise & Machine */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Franchise & Machine
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Franchise</span>
                <p className="font-medium">{invoice.franchises?.name || 'No Franchise'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Machine</span>
                <p className="font-medium">
                  {invoice.machines?.machine_name || 'No Machine'} 
                  {invoice.machines?.machine_number && ` (${invoice.machines.machine_number})`}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Sales</span>
                </div>
                <p className="text-2xl font-bold text-primary">৳{invoice.total_sales.toLocaleString()}</p>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Prize Cost</span>
                </div>
                <p className="text-2xl font-bold text-accent">৳{invoice.total_prize_cost.toLocaleString()}</p>
              </div>
              <div className="bg-success/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">Net Profit</span>
                </div>
                <p className="text-2xl font-bold text-success">৳{invoice.net_profit.toLocaleString()}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-warning" />
                  <span className="text-sm text-muted-foreground">Pay to Clowee</span>
                </div>
                <p className="text-2xl font-bold text-warning">৳{invoice.pay_to_clowee.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Share Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Share Breakdown</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/30 rounded-lg p-4">
                <span className="text-sm text-muted-foreground">Franchise Share</span>
                <p className="text-xl font-bold text-primary">৳{invoice.franchise_share_amount.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <span className="text-sm text-muted-foreground">Clowee Share</span>
                <p className="text-xl font-bold text-accent">৳{invoice.clowee_share_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Costs */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
            <div className="space-y-4">
              {invoice.vat_amount && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">VAT Amount</span>
                  <span className="font-medium">৳{invoice.vat_amount.toLocaleString()}</span>
                </div>
              )}
              {invoice.electricity_cost && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Electricity Cost</span>
                  <span className="font-medium">৳{invoice.electricity_cost.toLocaleString()}</span>
                </div>
              )}
              {invoice.pdf_url && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">PDF Document</span>
                  <a 
                    href={invoice.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}