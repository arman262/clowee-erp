import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Eye, Building2, DollarSign, Calendar, Percent } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { formatDate } from "@/lib/dateUtils";

interface FranchiseDetailsModalProps {
  franchise: Tables<'franchises'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranchiseDetailsModal({ franchise, open, onOpenChange }: FranchiseDetailsModalProps) {
  if (!franchise) return null;

  const agreementFiles = franchise.agreement_copy ? [franchise.agreement_copy] : [];
  const tradeNidFiles = franchise.trade_nid_copy || [];

  const handleViewFile = (url: string) => {
    console.log('Viewing file:', url);
    // For PDF viewing, open in new tab with proper headers
    const newWindow = window.open();
    if (newWindow) {
      newWindow.location.href = url;
    }
  };

  const handleDownloadFile = async (url: string, filename?: string) => {
    console.log('Downloading file:', url);
    try {
      // Fetch the file and create blob for download
      const response = await fetch(url);
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || url.split('/').pop() || 'file.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try direct download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'file.pdf';
      a.target = '_blank';
      a.click();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {franchise.name}
            <Badge variant="default" className="bg-success text-success-foreground">
              Active
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Franchise Name</span>
                <p className="font-medium">{franchise.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Payment Duration</span>
                <p className="font-medium">{franchise.payment_duration}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">{formatDate(franchise.created_at || '')}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <p className="font-medium">{formatDate(franchise.updated_at || '')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Costs
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/30 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Coin Price</span>
                <p className="text-lg font-semibold">৳{franchise.coin_price}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Doll Price</span>
                <p className="text-lg font-semibold">৳{franchise.doll_price}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Electricity Cost</span>
                <p className="text-lg font-semibold">৳{franchise.electricity_cost}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">VAT %</span>
                <p className="text-lg font-semibold">{franchise.vat_percentage || 'N/A'}%</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Profit Sharing */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Profit Sharing
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Franchise Share</span>
                <p className="text-lg font-semibold text-primary">{franchise.franchise_share}%</p>
              </div>
              <div className="bg-accent/10 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Clowee Share</span>
                <p className="text-lg font-semibold text-accent">{franchise.clowee_share}%</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Maintenance %</span>
                <p className="text-lg font-semibold">{franchise.maintenance_percentage || 'N/A'}%</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Deposit */}
          {(franchise.security_deposit_type || franchise.security_deposit_notes) && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Security Deposit</h3>
                <div className="space-y-2">
                  {franchise.security_deposit_type && (
                    <div>
                      <span className="text-sm text-muted-foreground">Type</span>
                      <p className="font-medium">{franchise.security_deposit_type}</p>
                    </div>
                  )}
                  {franchise.security_deposit_notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <p className="font-medium">{franchise.security_deposit_notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Attachments */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents & Attachments
            </h3>
            
            <div className="space-y-4">
              {/* Agreement Copy */}
              <div>
                <h4 className="font-medium mb-2">Agreement Copy</h4>
                {agreementFiles.length > 0 ? (
                  <div className="space-y-2">
                    {agreementFiles.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-secondary/20">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="flex-1 text-sm">
                          {url.split('/').pop() || 'Agreement Document'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewFile(url);
                          }}
                          title="View PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadFile(url, 'agreement.pdf');
                          }}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No agreement copy uploaded</p>
                )}
              </div>

              {/* Trade & NID Copy */}
              <div>
                <h4 className="font-medium mb-2">Trade & NID Copy</h4>
                {tradeNidFiles.length > 0 ? (
                  <div className="space-y-2">
                    {tradeNidFiles.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-secondary/20">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="flex-1 text-sm">
                          {url.split('/').pop() || `Trade/NID Document ${index + 1}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewFile(url);
                          }}
                          title="View PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadFile(url, `trade-nid-${index + 1}.pdf`);
                          }}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No trade/NID documents uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}