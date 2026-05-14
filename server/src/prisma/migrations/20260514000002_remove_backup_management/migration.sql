-- Migration: remove backup management tables
-- Removes BackupHistory table that was part of the deleted in-app backup management surface

DROP TABLE IF EXISTS "backup_history";
