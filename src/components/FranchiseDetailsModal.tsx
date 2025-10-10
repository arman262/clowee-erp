import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Eye, Building2, DollarSign, Calendar, Percent, Plus, History, Edit, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { FranchiseAgreementModal } from "@/components/FranchiseAgreementModal";
import { useFranchiseAgreements, useDeleteFranchiseAgreement } from "@/hooks/useFranchiseAgreements";

interface FranchiseDetailsModalProps {
  franchise: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranchiseDetailsModal({ franchise, open, onOpenChange }: FranchiseDetailsModalProps) {
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<any | null>(null);
  const { data: agreements, isLoading: agreementsLoading } = useFranchiseAgreements(franchise?.id);
  const deleteAgreement = useDeleteFranchiseAgreement();
  
  // Debug log to check data
  useEffect(() => {
    if (agreements) {
      console.log('Agreement data:', agreements);
      console.log('Number of agreements:', agreements.length);
    }
  }, [agreements]);
  
  if (!franchise) return null;

  const agreementFiles = franchise.agreement_copy ? [franchise.agreement_copy] : [];
  const tradeNidFiles = franchise.trade_nid_copy || [];

  const handleViewFile = (url: string) => {
    console.log('Viewing file:', url);
    
    // Check if URL is valid (not a placeholder or file protocol)
    if (url.startsWith('placeholder://') || url.startsWith('file://') || !url.startsWith('http')) {
      toast.error('Cannot view file: Invalid or placeholder URL');
      return;
    }
    
    // Check if file exists before opening
    fetch(url, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          // File exists, open in new tab
          const newWindow = window.open();
          if (newWindow) {
            newWindow.location.href = url;
          }
        } else if (response.status === 404) {
          toast.error('File not found on server');
        } else {
          toast.error(`Cannot view file: ${response.status}`);
        }
      })
      .catch(() => {
        toast.error('Cannot view file: Network error');
      });
  };

  const handleDownloadFile = async (url: string, filename?: string) => {
    console.log('Downloading file:', url);
    
    // Check if URL is valid (not a placeholder or file protocol)
    if (url.startsWith('placeholder://') || url.startsWith('file://') || !url.startsWith('http')) {
      toast.error('Cannot download file: Invalid or placeholder URL');
      return;
    }
    
    try {
      // Fetch the file and create blob for download
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('File not found on server');
        } else {
          toast.error(`Failed to download file: ${response.status}`);
        }
        return;
      }
      
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
      toast.error('Failed to download file: Network error');
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Costs
              </h3>
              {agreements && agreements.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Effective: {formatDate(agreements[0].effective_date)}
                </span>
              )}
            </div>
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

          {/* Payment Bank Details */}
          {franchise.banks && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Payment Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Bank Name</span>
                    <p className="font-medium">{franchise.banks.bank_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Account Number</span>
                    <p className="font-medium font-mono">{franchise.banks.account_number}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Account Holder</span>
                    <p className="font-medium">{franchise.banks.account_holder_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Branch</span>
                    <p className="font-medium">{franchise.banks.branch_name}</p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Agreement History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Agreement History
              </h3>
              <Button 
                onClick={() => setShowAgreementModal(true)}
                className="bg-gradient-primary hover:opacity-90"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Agreement
              </Button>
            </div>
            
            {agreementsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading agreement history...</span>
              </div>
            ) : agreements && agreements.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">
                  Showing {agreements.length} agreement{agreements.length > 1 ? 's' : ''} (sorted by most recent)
                </div>
                {agreements.map((agreement, index) => (
                  <div key={agreement.id || index} className={`p-4 border rounded-lg ${
                    index === 0 ? 'bg-primary/10 border-primary/30' : 'bg-secondary/20'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Agreement #{agreements.length - index}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(agreement.effective_date || agreement.created_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAgreement(agreement)}
                          title="Edit Agreement"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this agreement?')) {
                              deleteAgreement.mutate(agreement.id);
                            }
                          }}
                          title="Delete Agreement"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Coin Price</span>
                        <p className="font-medium">৳{Number(agreement.coin_price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Doll Price</span>
                        <p className="font-medium">৳{Number(agreement.doll_price || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Share Split</span>
                        <p className="font-medium">{Number(agreement.franchise_share || 0)}% / {Number(agreement.clowee_share || 0)}%</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">VAT %</span>
                        <p className="font-medium">{Number(agreement.vat_percentage || 0)}%</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Electricity Cost</span>
                        <p className="font-medium">৳{Number(agreement.electricity_cost || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Payment Duration</span>
                        <p className="font-medium">{agreement.payment_duration || 'Monthly'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Created</span>
                        <p className="font-medium">{formatDate(agreement.created_at)}</p>
                      </div>
                    </div>
                    
                    {agreement.notes && (
                      <div className="mt-3 p-2 bg-secondary/30 rounded">
                        <span className="text-sm text-muted-foreground">Notes:</span>
                        <p className="text-sm mt-1">{agreement.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No agreement history available</p>
                <p className="text-xs text-muted-foreground mt-1">Create a new agreement to start tracking changes</p>
              </div>
            )}
          </div>

          <Separator />

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
                    {agreementFiles.filter(url => url).map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-secondary/20">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="flex-1 text-sm">
                          {url ? (url.split('/').pop() || 'Agreement Document') : 'Agreement Document'}
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
                    {tradeNidFiles.filter(url => url).map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-secondary/20">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="flex-1 text-sm">
                          {url ? (url.split('/').pop() || `Trade/NID Document ${index + 1}`) : `Trade/NID Document ${index + 1}`}
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
        
        {/* Agreement Modal */}
        <FranchiseAgreementModal
          franchise={franchise}
          open={showAgreementModal || !!editingAgreement}
          onOpenChange={(open) => {
            if (!open) {
              setShowAgreementModal(false);
              setEditingAgreement(null);
            }
          }}
          initialData={editingAgreement}
        />
      </DialogContent>
    </Dialog>
  );
}