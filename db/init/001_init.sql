BEGIN;
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone BIGINT,
    created_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255)
);
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    category_id INTEGER REFERENCES categories(id) ON DELETE
    SET NULL,
        listed BOOLEAN NOT NULL,
        created_at TIMESTAMP NOT NULL
);
CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_pence INTEGER NOT NULL CHECK (price_pence >= 0),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    CHECK (
        ends_at IS NULL
        OR ends_at > starts_at
    )
);
CREATE TABLE stock (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
    quantity_reserved INTEGER NOT NULL CHECK (quantity_reserved >= 0),
    updated_at TIMESTAMP NOT NULL,
    CHECK (quantity_reserved <= quantity_on_hand)
);
COMMIT;
