INSERT INTO staff (
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        admin_level,
        created_at
    )
VALUES (
        'root@supermarket.com',
        '$2b$12$tJxnyWtAu0ArtRql3eWIN.0Sp5yUBQKLaKmvp4.F4xXlVngVLWL2i',
        'Root',
        'User',
        NULL,
        999,
        NOW()
    );
