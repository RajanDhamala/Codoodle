ALTER TABLE "User"
ALTER COLUMN "googleProviderId" TYPE TEXT USING "googleProviderId"::TEXT,
ALTER COLUMN "githubProviderId" TYPE TEXT USING "githubProviderId"::TEXT;
