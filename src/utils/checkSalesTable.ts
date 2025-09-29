import { db } from "@/integrations/postgres/client";

export async function checkAndCreateSalesTable() {
  try {
    // First, try to select from the sales table to see if it exists
    const data = await db
      .from('sales')
      .select('id')
      .execute();

    if (data) {
      console.log('Sales table exists');
      return true;
    } else {
      console.log('Sales table does not exist. Please run the SQL migration manually.');
      return false;
    }
  } catch (error) {
    console.error('Error in checkAndCreateSalesTable:', error);
    return false;
  }
}