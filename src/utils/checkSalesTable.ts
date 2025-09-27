import { supabase } from "@/integrations/supabase/client";

export async function checkAndCreateSalesTable() {
  try {
    // First, try to select from the sales table to see if it exists
    const { error: selectError } = await supabase
      .from('sales')
      .select('id')
      .limit(1);

    if (selectError && selectError.code === 'PGRST116') {
      console.log('Sales table does not exist. Please run the SQL migration manually.');
      return false;
    } else if (selectError) {
      console.error('Error checking sales table:', selectError);
      return false;
    }
    
    console.log('Sales table exists');
    return true;
  } catch (error) {
    console.error('Error in checkAndCreateSalesTable:', error);
    return false;
  }
}