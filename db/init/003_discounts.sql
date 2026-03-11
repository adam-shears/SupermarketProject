BEGIN;
CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255),
    name VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    value INTEGER NOT NULL CHECK (value >= 0),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    active BOOLEAN NOT NULL,
    CHECK (
        ends_at IS NULL
        OR ends_at > starts_at
    )
);
CREATE TABLE product_discounts (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    discount_id INTEGER NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, discount_id)
);
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_applied_discount FOREIGN KEY (applied_discount_id) REFERENCES discounts(id) ON DELETE
SET NULL;
COMMIT;
