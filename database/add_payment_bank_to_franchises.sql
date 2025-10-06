-- Add payment_bank_id column to franchises table
ALTER TABLE franchises 
ADD COLUMN payment_bank_id UUID REFERENCES banks(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_franchises_payment_bank_id ON franchises(payment_bank_id);

-- Update existing franchises to have no bank initially (NULL is default)
-- This is safe as the column allows NULL values