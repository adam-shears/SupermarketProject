BEGIN;

CREATE TABLE stock_issues (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    reporter_id INT REFERENCES staff(id),
    status VARCHAR(16) NOT NULL CHECK (status IN ('unresolved', 'resolved')) DEFAULT 'unresolved',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

COMMIT;
