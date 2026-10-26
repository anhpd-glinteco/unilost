# test(posts): verify private image UI and replay fixtures

Refs #16; stacked directly on the committed frontend image UI (#13) when available. Adds ownership/status projection tests, SSR loading/write-control tests, a guarded localhost fixture bridge with synthetic images, and a browser replay runbook. Product API/migrations/grants/dependencies are unchanged.

Validation: see VERIFICATION.md for actual local/isolated patch checks and browser assertions. The supplied frontend patch is a replay dependency only; this PR must contain the QA allowlist, not duplicate the frontend implementation. Independent review and CI after publication remain pending. Tests on a dedicated Supabase project do not establish production, fresh PKCE, clock-driven JWT expiry or exactly-once transport behavior.

Code/test preparation: Codex with Phùng Đức Anh. Hoàng Minh Nhật is the assigned reviewer/recipient; record their actual review/integration/test contributions when performed. Do not claim them before review.
