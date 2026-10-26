# W06 / B1f verification — 24/10/2026 (Asia/Saigon)

Producer: /root (Codex). Source branch feature/unilost-post-image-ui. Shared audit is in the dated checkpoint; this package includes behavior/replay evidence under evidence/. Base e03017416bb5adbc3fb764df037bfd5e0eddd2d8, PR #63. Source fingerprint: `3bfdb6071ef171dc4348080c32b56cf9d296bbc874f03582aaf5eafedb9f6a3c`; hashes in source-hashes.json. This is local verification, not independent review, hosted production acceptance or publication.

| Gate | Result | Evidence |
|---|---|---|
| Current ownership/issue/PR/CI | PASS read-only audit | issues.json, issue comments, prs.json and PR diffs; nine selected PRs show web SUCCESS at recorded heads |
| Unit | PASS 389/389, 25 files | unit-final.log; includes claim regression, 12 additional image/page/fixture-boundary cases relative to 377 baseline |
| Typecheck | PASS | typecheck-final.log |
| Lint | PASS command, one warning | lint-final.log; native img is used for authenticated private blob bytes |
| Build | PASS | replay-build.log at exact exported source; existing Vinext route classification warnings retained |
| UI/browser | PASS for 43 recorded assertions | browser-checks.json, PNGs; desktop 1086x844 / mobile 390x844, DPR 1, real local app + dedicated Supabase test |
| Fixture cleanup | PASS in three runs | fixture-summary.json, fixture2-summary.json, fixture3-summary.json; Auth/profiles/posts/images/claims/history and tracked objects readback |
| Fixture final-source smoke | PASS | inputs generated, capability denied without key, readback, revoke access, cleanup; no app-facing browser replay in third run |
| Patch replay | PASS | fresh detached checkout at documented SHA; frontend dependency then QA patch, git apply --check/apply and diff --check; 14 source files match after LF normalization |
| Replay unit/types/lint/build | PASS all four exit 0 | replay-results.json, replay-*.log; node_modules junction reused existing lockfile installation, no npm ci rerun |
| React Doctor | PASS diagnostic command with four warnings | react-doctor-final.log + diagnostics.md; explicit task base and untracked included. Earlier auto-base scan exit 1 retained |
| Independent review | BLOCKED | frontend-workflow routing: priority-only/unconfirmed tier forbids auto-dispatch. No cost-compliant independent runtime confirmed; self-review is not independent |
| New CI / Sheet / production / fresh PKCE | NOT_RUN | No commit/push/PR/external writes authorized by this handoff |

## Observed behavior and limitations

Create a pending found post through UI then attach PNG; detail mounts one image instance. Validation rejects wrong MIME/empty/oversize; PNG/JPEG/WebP decode; replacing 320px image with 240px bytes displays fresh image and returns published to pending. Double-click sends one PUT. Cancel delete with Escape returns focus after dialog transition; confirmation sends one DELETE and image disappears. Preview discard does not mutate. Guest/stranger/admin-outsider have no image controls; owner terminal post has none; hidden/matched lost stays hidden after upload. Revoking a disposable actor by ban returns HTTP 401, locks controls and links no image; this is not clock-driven JWT expiry.

When response JSON body is cut after commit, UI reports uncertainty, locks mutations, offers navigation to exact post ID, reads back committed bytes after reload, and does not infer mutation success. Bare disconnect before any response header caused Chromium to transparently replay PUT (two writes) in the retained first attempt; API has no idempotency key, so exactly-once under all network failures is **not** established. Application code has no retry loop. See diagnostics.md and runbook.

No API/backend/migration/grants/dependency change. No hosted SQL/migration replay or broad claim API rerun; 558/1136 and earlier browser Worker results are historical. Browser verification here used dev, not the built Worker; final build itself passed. No load, production HTTPS or fresh email PKCE acceptance. Direct in-app browser was used, not an independent reviewer.

## Historical claim evidence

A9b 20/10 original manifest: 48/49 hashes match now. worker-server.log mismatches and is excluded from certified/copied historical artifacts. Other selected copied artifacts individually match original recorded hashes. Original manifest retained unchanged; this integrity check is not a new execution of old tests.

## Contributions and status

Codex prepared implementation, tests, integration checks and packaging with Phùng Đức Anh. Member names represent issue ownership and recipients, not reviews/commits already performed. Frontend stays in your working tree; support dependency patch permits isolated replay. Nhật's code.patch contains only QA-owned tests/fixtures/runbook. Trường and Đức have no new eligible code diff, so receive references with no empty/duplicate patch.

Awaiting frontend predecessor commit, member review/commit/push/PR, independent review and week consolidation. No issue was closed, no PR created, no merge/deploy or Sheet edit.
