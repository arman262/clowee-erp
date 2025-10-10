import { db } from "@/integrations/postgres/client";
import { toast } from 'sonner';

export const checkInvoicesCount = async () => {
  try {
    const { data } = await db.from('invoices').select('*');
    const count = data?.length || 0;
    toast.info(`Invoices table has ${count} records`);
    return count;
  } catch (error: any) {
    toast.error('Failed to check invoices: ' + error.message);
    return 0;
  }
};