-- Operations record: every run of a background job, so whether the
-- scheduled reconcile is actually running on the deployed site can be read
-- from the health endpoint and the admin page rather than guessed from logs.
CREATE TABLE job_runs (
  id          bigserial PRIMARY KEY,
  job         text NOT NULL,
  started_at  timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX job_runs_job_started ON job_runs (job, started_at DESC);
