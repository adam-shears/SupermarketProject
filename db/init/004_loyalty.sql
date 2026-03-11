BEGIN;
CREATE TABLE loyalty_accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL CHECK (points >= 0),
    tier VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
CREATE TABLE loyalty_transactions (
    id SERIAL PRIMARY KEY,
    loyalty_account_id INTEGER NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE
    SET NULL,
        type VARCHAR(50),
        point_change INTEGER,
        timestamp TIMESTAMP
);
COMMIT;
