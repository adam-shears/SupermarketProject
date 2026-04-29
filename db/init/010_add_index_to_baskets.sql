BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS baskets_one_active_unsaved_per_customer ON baskets (customer_id)
WHERE saved = FALSE
    AND customer_id IS NOT NULL;
COMMIT;
