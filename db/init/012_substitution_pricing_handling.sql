BEGIN;
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS substitution_price_pence_per_unit INTEGER NULL CHECK (substitution_price_pence_per_unit >= 0);
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS substitution_line_subtotal_pence INTEGER NULL CHECK (substitution_line_subtotal_pence >= 0);
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS substitution_line_total_pence INTEGER NULL CHECK (substitution_line_total_pence >= 0);
COMMIT;
