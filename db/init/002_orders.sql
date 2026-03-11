BEGIN;
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE
    SET NULL,
        guest_email VARCHAR(255),
        guest_name VARCHAR(255),
        guest_phone BIGINT,
        status VARCHAR(50) NOT NULL,
        subtotal_pence INTEGER NOT NULL CHECK (subtotal_pence >= 0),
        discount_pence INTEGER CHECK (discount_pence >= 0),
        total_pence INTEGER NOT NULL CHECK (total_pence >= 0),
        created_at TIMESTAMP NOT NULL,
        last_updated TIMESTAMP NOT NULL,
        CHECK (
            customer_id IS NOT NULL
            OR guest_email IS NOT NULL
        )
);
CREATE TABLE order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_pence_per_unit INTEGER NOT NULL CHECK (price_pence_per_unit >= 0),
    line_subtotal_pence INTEGER NOT NULL CHECK (line_subtotal_pence >= 0),
    line_discount_pence INTEGER CHECK (line_discount_pence >= 0),
    applied_discount_id INTEGER,
    line_total_pence INTEGER NOT NULL CHECK (line_total_pence >= 0),
    PRIMARY KEY (order_id, product_id)
);
CREATE TABLE baskets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE
    SET NULL,
        name VARCHAR(255),
        saved BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
);
CREATE TABLE basket_items (
    basket_id INTEGER NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (basket_id, product_id)
);
COMMIT;
