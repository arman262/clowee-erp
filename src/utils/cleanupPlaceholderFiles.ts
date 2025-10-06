import { db } from "@/integrations/postgres/client";
import { toast } from "sonner";

export const cleanupPlaceholderFiles = async () => {
  try {
    // Get all franchises
    const franchises = await db.from('franchises').select('*').execute();
    
    let cleanupCount = 0;
    
    for (const franchise of franchises) {
      let needsUpdate = false;
      const updates: any = {};
      
      // Clean up agreement_copy if it's a placeholder
      if (franchise.agreement_copy && 
          (franchise.agreement_copy.startsWith('placeholder://') || 
           franchise.agreement_copy.startsWith('file://'))) {
        updates.agreement_copy = null;
        needsUpdate = true;
      }
      
      // Clean up trade_nid_copy array
      if (franchise.trade_nid_copy && Array.isArray(franchise.trade_nid_copy)) {
        const cleanedArray = franchise.trade_nid_copy.filter((url: string) => 
          url && 
          !url.startsWith('placeholder://') && 
          !url.startsWith('file://') &&
          url.startsWith('http')
        );
        
        if (cleanedArray.length !== franchise.trade_nid_copy.length) {
          updates.trade_nid_copy = cleanedArray.length > 0 ? cleanedArray : [];
          needsUpdate = true;
        }
      }
      
      // Update the franchise if needed
      if (needsUpdate) {
        await db.from('franchises')
          .update(updates)
          .eq('id', franchise.id)
          .select()
          .single();
        cleanupCount++;
      }
    }
    
    if (cleanupCount > 0) {
      toast.success(`Cleaned up ${cleanupCount} franchise(s) with invalid file URLs`);
    }
    
    return cleanupCount;
  } catch (error) {
    console.error('Cleanup error:', error);
    toast.error('Failed to cleanup placeholder files');
    return 0;
  }
};