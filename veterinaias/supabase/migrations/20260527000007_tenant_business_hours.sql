-- Update tenants.settings default to include business_hours
ALTER TABLE tenants
  ALTER COLUMN settings SET DEFAULT '{
    "confirmation_reminder_days": 2,
    "share_link_expiry_days": 7,
    "business_hours": {
      "days": [1, 2, 3, 4, 5, 6],
      "start": "09:00",
      "end": "18:00",
      "slot_interval": 30
    }
  }'::jsonb;

-- Backfill existing rows that don't have business_hours yet
UPDATE tenants
SET settings = settings || '{
  "business_hours": {
    "days": [1, 2, 3, 4, 5, 6],
    "start": "09:00",
    "end": "18:00",
    "slot_interval": 30
  }
}'::jsonb
WHERE settings IS NOT NULL
  AND settings -> 'business_hours' IS NULL;
