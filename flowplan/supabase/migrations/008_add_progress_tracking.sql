-- Migration 008: Add progress tracking fields to tasks
-- Phase 6: Progress Tracking
--
-- Adds percent_complete (0-100), actual_start_date, actual_finish_date
-- for bidirectional percent/status synchronization.

ALTER TABLE tasks
  ADD COLUMN percent_complete INTEGER DEFAULT 0 NOT NULL
    CHECK (percent_complete >= 0 AND percent_complete <= 100),
  ADD COLUMN actual_start_date DATE DEFAULT NULL,
  ADD COLUMN actual_finish_date DATE DEFAULT NULL;

ALTER TABLE tasks
  ADD CONSTRAINT valid_actual_dates
    CHECK (actual_finish_date IS NULL OR actual_start_date IS NULL
           OR actual_finish_date >= actual_start_date);
