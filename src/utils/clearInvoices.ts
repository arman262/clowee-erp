import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

export const clearAllInvoices = async () => {
  try {
    await db.from('invoices').delete().execute();
    toast.success('All invoices cleared successfully');
    return true;
  } catch (error: any) {
    toast.error('Failed to clear invoices: ' + error.message);
    return false;
  }
};