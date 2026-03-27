BEGIN;
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    -- 0 = customer, 1 = picker, 2 = manager, 999 = superuser
    admin_level INTEGER NOT NULL CHECK (admin_level >= 0) DEFAULT 1,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone BIGINT,
    created_at TIMESTAMP NOT NULL
);
COMMIT;
