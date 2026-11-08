-- Steam links made after the better-auth 1.7.18 upgrade (2026-11-06) were saved
-- without their issuer, and the site couldn't see them (Steam showed as not connected,
-- while connecting again said it already was). Give each its issuer back. Only the
-- oldest row per Steam account, and none that another account already holds with the
-- issuer, so the unique issuer + account id can't be broken.
UPDATE "Account" AS a
SET "issuer" = 'https://steamcommunity.com/openid'
WHERE a."id" IN (
    SELECT DISTINCT ON ("accountId") "id"
    FROM "Account"
    WHERE "providerId" = 'steam' AND "issuer" IS NULL
    ORDER BY "accountId", "createdAt"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Account" AS b
    WHERE b."issuer" = 'https://steamcommunity.com/openid' AND b."accountId" = a."accountId"
  );
