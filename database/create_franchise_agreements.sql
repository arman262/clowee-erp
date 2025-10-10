CREATE TABLE franchise_agreements (
    id SERIAL PRIMARY KEY,
    franchise_id INTEGER REFERENCES franchises(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    coin_price DECIMAL(10,2) NOT NULL,
    doll_price DECIMAL(10,2) NOT NULL,
    electricity_cost DECIMAL(10,2) DEFAULT 0,
    vat_percentage DECIMAL(5,2) DEFAULT 0,
    franchise_share DECIMAL(5,2) NOT NULL,
    clowee_share DECIMAL(5,2) NOT NULL,
    payment_duration VARCHAR(50) DEFAULT 'Monthly',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX idx_franchise_agreements_franchise_id ON franchise_agreements(franchise_id);
CREATE INDEX idx_franchise_agreements_effective_date ON franchise_agreements(effective_date);

-- Insert initial agreements from existing franchise data
INSERT INTO franchise_agreements (
    franchise_id, 
    effective_date, 
    coin_price, 
    doll_price, 
    electricity_cost, 
    vat_percentage, 
    franchise_share, 
    clowee_share, 
    payment_duration,
    notes
)
SELECT 
    id,
    COALESCE(created_at::date, CURRENT_DATE),
    coin_price,
    doll_price,
    electricity_cost,
    vat_percentage,
    franchise_share,
    clowee_share,
    payment_duration,
    'Initial agreement from franchise setup'
FROM franchises;