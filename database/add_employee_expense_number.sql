-- Add employee_id and expense_number columns to machine_expenses table

-- Add employee_id column
ALTER TABLE machine_expenses 
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);

-- Add expense_number column
ALTER TABLE machine_expenses 
ADD COLUMN IF NOT EXISTS expense_number VARCHAR(50);

-- Add created_by column if not exists
ALTER TABLE machine_expenses 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Create index for employee_id
CREATE INDEX IF NOT EXISTS idx_machine_expenses_employee_id ON machine_expenses(employee_id);

-- Create index for expense_number
CREATE INDEX IF NOT EXISTS idx_machine_expenses_expense_number ON machine_expenses(expense_number);
