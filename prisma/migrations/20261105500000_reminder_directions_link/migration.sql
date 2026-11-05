-- One-time: add the directions link to saved appointment reminder messages.
-- The owner can move or remove it afterwards in Settings -> Messages; it is not re-added.

UPDATE "BusinessSettings"
SET "notificationMessages" = jsonb_set(
  "notificationMessages",
  '{reminderCustomerBody}',
  to_jsonb(
    CASE
      WHEN strpos("notificationMessages"->>'reminderCustomerBody', E'\n\n— ') > 0
        THEN regexp_replace(
          "notificationMessages"->>'reminderCustomerBody',
          E'\n\n— ',
          E'\n\nFind us: \u200BDirections link\u200C\n\n— '
        )
      ELSE rtrim("notificationMessages"->>'reminderCustomerBody') || E'\n\nFind us: \u200BDirections link\u200C'
    END
  )
)
WHERE "id" = 'default'
  AND jsonb_typeof("notificationMessages") = 'object'
  AND jsonb_typeof("notificationMessages"->'reminderCustomerBody') = 'string'
  AND ("notificationMessages"->>'reminderCustomerBody') NOT LIKE '%Directions link%';

UPDATE "BusinessSettings"
SET "notificationMessages" = jsonb_set(
  "notificationMessages",
  '{reminderCustomerSms}',
  to_jsonb(
    CASE
      WHEN strpos("notificationMessages"->>'reminderCustomerSms', 'See you soon!') > 0
        THEN replace(
          "notificationMessages"->>'reminderCustomerSms',
          'See you soon!',
          E'Find us: \u200BDirections link\u200C See you soon!'
        )
      ELSE rtrim("notificationMessages"->>'reminderCustomerSms') || E' Find us: \u200BDirections link\u200C'
    END
  )
)
WHERE "id" = 'default'
  AND jsonb_typeof("notificationMessages") = 'object'
  AND jsonb_typeof("notificationMessages"->'reminderCustomerSms') = 'string'
  AND ("notificationMessages"->>'reminderCustomerSms') NOT LIKE '%Directions link%';
