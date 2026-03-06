-- 022_rename_shipped_to_sent.sql
-- Rename delivery_status enum value 'shipped' -> 'sent'

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'delivery_status'::regtype
          AND enumlabel = 'shipped'
    ) THEN
        ALTER TYPE delivery_status RENAME VALUE 'shipped' TO 'sent';
    END IF;
END $$;
