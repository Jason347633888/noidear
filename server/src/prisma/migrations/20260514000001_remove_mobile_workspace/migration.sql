-- Migration: remove mobile workspace tables
-- Removes MobileUpload and SyncSubmission tables that were part of the deleted mobile workspace

DROP TABLE IF EXISTS "sync_submissions";
DROP TABLE IF EXISTS "mobile_uploads";
