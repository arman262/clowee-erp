-- Create bank_money_logs table
CREATE TABLE IF NOT EXISTS bank_money_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('add', 'deduct')),
  amount DECIMAL(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  remarks TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_money_logs_bank_id ON bank_money_logs(bank_id);
CREATE INDEX idx_bank_money_logs_date ON bank_money_logs(transaction_date);
