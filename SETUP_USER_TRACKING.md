# Setup User Tracking - Quick Guide

## Current Status
✅ Code is ready - expenses, sales, payments, and counter readings can be created
❌ User names show as "System" because database doesn't have the `created_by` column yet

## To Enable User Name Tracking

### Step 1: Run the SQL Migration
Execute this SQL in your PostgreSQL database:

```sql
-- Add created_by field to track who created each record

-- Add created_by to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add created_by to machine_expenses table
ALTER TABLE public.machine_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add created_by to machine_payments table
ALTER TABLE public.machine_payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Add created_by to machine_counters table
ALTER TABLE public.machine_counters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_expenses_created_by ON public.machine_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_payments_created_by ON public.machine_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_counters_created_by ON public.machine_counters(created_by);
```

### Step 2: Update the Code to Store User ID

After running the SQL, update these files to store the user ID when creating records:

**File: src/hooks/useMachineExpenses.ts**
Change line in `useCreateMachineExpense`:
```typescript
// FROM:
const { data: result } = await db
  .from("machine_expenses")
  .insert(data)
  .select()
  .single();

// TO:
const storedUser = localStorage.getItem('clowee_user');
const userId = storedUser ? JSON.parse(storedUser).user.id : null;
const insertData = userId ? { ...data, created_by: userId } : data;

const { data: result } = await db
  .from("machine_expenses")
  .insert(insertData)
  .select()
  .single();
```

Apply the same pattern to:
- `src/hooks/useSales.ts` (useCreateSale)
- `src/hooks/useMachinePayments.ts` (useCreateMachinePayment)
- `src/hooks/useMachineCounters.ts` (useCreateMachineCounter)

### Step 3: Test
1. Log in as a user (e.g., "Clowee Admin")
2. Create a new expense
3. Check the Dashboard - it should now show: `(Clowee Admin, 1:35 PM 15 Oct 2025)`

## Quick Copy-Paste Solution

Run this in your database, then I'll update the code for you:

```sql
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
ALTER TABLE public.machine_expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
ALTER TABLE public.machine_payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
ALTER TABLE public.machine_counters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_expenses_created_by ON public.machine_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_payments_created_by ON public.machine_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_counters_created_by ON public.machine_counters(created_by);
```

After running this SQL, let me know and I'll update the code to start storing user IDs.
