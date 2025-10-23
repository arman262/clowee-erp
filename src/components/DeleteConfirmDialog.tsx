import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  details: { label: string; value: string | number }[];
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  details
}: DeleteConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmed(false);
    }
    onOpenChange(newOpen);
  };
  
  const handleConfirm = () => {
    onConfirm();
    setConfirmed(false);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <p className="text-sm text-muted-foreground">You are about to delete:</p>
          <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{detail.label}:</span>
                <span className="font-medium">{detail.value}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-destructive font-medium">This action cannot be undone.</p>
        </div>
        <div className="flex items-center space-x-2 py-3 border-t">
          <Checkbox id="confirm-delete" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
          <Label htmlFor="confirm-delete" className="text-sm font-medium cursor-pointer">
            Yes, I want to delete this record
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!confirmed}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
