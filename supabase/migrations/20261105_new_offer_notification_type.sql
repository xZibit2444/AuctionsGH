-- Let offer alerts keep their own type instead of falling back to 'system',
-- so the bell shows the offer icon and offer deep-links work by type.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_offer';
