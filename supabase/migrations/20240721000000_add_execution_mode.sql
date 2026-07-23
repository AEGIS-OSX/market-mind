ALTER TABLE user_settings ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'recommend' CHECK (execution_mode IN ('auto', 'recommend'));
