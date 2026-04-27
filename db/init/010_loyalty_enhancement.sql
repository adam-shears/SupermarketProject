-- Loyalty Enhancement: Add coupons table and tier benefits
BEGIN;

-- Add tier_benefits table to store tier-specific benefits
CREATE TABLE IF NOT EXISTS loyalty_tier_benefits (
    id SERIAL PRIMARY KEY,
    tier VARCHAR(50) NOT NULL UNIQUE,
    points_per_pound INTEGER NOT NULL DEFAULT 1,  -- points earned per £1 spent
    redemption_rate INTEGER NOT NULL DEFAULT 100,  -- points needed for £1 discount
    coupon_on_upgrade INTEGER NOT NULL DEFAULT 0,   -- number of coupons given on upgrade
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add coupons table to store generated coupons
CREATE TABLE IF NOT EXISTS loyalty_coupons (
    id SERIAL PRIMARY KEY,
    loyalty_account_id INTEGER NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    min_spend_pence INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default tier benefits
INSERT INTO loyalty_tier_benefits (tier, points_per_pound, redemption_rate, coupon_on_upgrade) VALUES
    ('Bronze', 1, 100, 0),
    ('Silver', 2, 100, 1),
    ('Gold', 3, 100, 2)
ON CONFLICT (tier) DO NOTHING;

COMMIT;