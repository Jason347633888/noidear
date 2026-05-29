# Decisions: Dynamic Form Retirement

## 2026-05-24

- **Archive policy:** `archive/superpowers/` model-landing historical spec/plan/csv retained as historical records; not deleted. Running code, generated artifacts, scripts, and active protocol references are removed.
- **Independent business records:** `EnvironmentRecord`, `ProcessMonitorRecord`, `CleaningRecord`, etc. are preserved — only dynamic-template-driven models are retired.
- **DeviationReport:** retained as independent table for read/export and future independent business writers; dynamic auto-detection writer removed.
- **ShiftCompletion:** returns stub completion stats (100%) since dynamic template-based counting is no longer possible.
