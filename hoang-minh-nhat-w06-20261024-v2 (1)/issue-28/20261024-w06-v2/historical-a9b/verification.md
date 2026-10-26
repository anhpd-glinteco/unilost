# A9b verification — 20 October 2026, Asia/Saigon

Base A9a: 0f582d08fdbb3fb40405dcb7e9b07f6a0781d5d3 / PR #57. Task branch: test/unilost-a9b-claim-acceptance. Author/producer: /root; no independent reviewer. Existing dirty AGENTS.md and two report files were preserved; only three acceptance documents staged. Product/API/migrations/grants/config/dependencies unchanged.

## Fresh checks

- Unit: 307/307 tests, 19 files, exit 0. Types/lint/build exit 0; retained logs. Build retains existing Vinext classification warnings. Checks used heap 512 MB; lint finished while build was running, both passed. No added dependency.
- Dedicated Supabase test: 558 Auth/trigger/REST/Storage checks PASS; A5 five actors/post-state reads; A6 create/cancel and proof validation; A7 owner decisions and three concurrency variants. Cleanup/readback PASS. No SQL suite rerun; A7 transactional fault-injection SQL remains historical evidence only.
- Dev: 43 browser groups PASS (journey 5, A8a 13, A8b 13, A9a 12). Local built Cloudflare Worker: same 43 groups PASS. All final logs confirm fixture cleanup; all summaries have zero page errors. Browser fixture authentication uses actual Supabase password sessions injected as cookies; does not exercise the fresh email/PKCE flow.
- Journey creates found pending through UI, confirms requester 404, publishes through trusted fixture API, sends trimmed proof through UI, checks sent/received controls and owner UI acceptance, reads accepted/verifying/exactly one searching→verifying history with actual owner actor, and checks requester final state. Publication is fixture setup, not an admin UI feature. Feed/search are excluded.
- Browser regression covers private payloads/proof escape, five status labels, role scoping/account changes/cleared cookies, independent pagination, keyboard/focus, 1086 and 390×844 DPR1, stale/expired/lost response, pending/double click and hidden/deleted decisions. Browser concurrency is an actual UI action against a competing authenticated RPC, not two simultaneous UI clicks or load testing.
- Visually inspected dev 390px confirmation dialog and Worker 390px full list. Automated overflow assertions passed in both runtimes. No broad visual-design audit claimed.

## Preserved harness failure

Worker A8a attempt 1 asserted login `next` immediately after clicking, before navigation completed. Cleanup passed. Log retained at worker-a8a/attempt1-navigation-race.log. Added waitForURL for login pathname, retaining original exact `next` assertion, then reran and passed. Dev passed before this wait addition; business assertions otherwise identical. No product repair, weakened assertion or mutation retry.

## Evidence and limitations

Replay scripts are included at this output root and in D:/Codex/work/unilost/a9b/. Verification JSON binds source/script hashes and exact PR CI head; manifest hashes output artifacts. Credentials remain outside Git; token-pattern scan is a bounded check, not an exhaustive secret audit. Test fake proof/UUIDs may appear in screenshots; real proof, passwords and tokens are excluded. Main evidence remains local and has not been uploaded; reviewer needs the artifact bundle separately.

PASS means only the checks above. Independent review PENDING; no substitution by self-review. Sheet NOT_UPDATED. Production HTTPS/Secure cookies, fresh email PKCE, C1 return/completion and staging deployment NOT_CHECKED/OUT_OF_SCOPE. No merge/deploy. #25/#27/#28 remain OPEN pending broader acceptance, independent review and Week 6 Sheet consolidation. #26 was already CLOSED at intake and is not reopened or newly closed by A9b.

## GitHub closeout

Draft PR https://github.com/anhpd-glinteco/unilost/pull/58 stacked directly on PR #57. Final head 233c7edb61518129c1f4c84900874e34b8088664 pushed. CI web SUCCESS on that exact head: https://github.com/anhpd-glinteco/unilost/actions/runs/39380652043/job/118488770263 . Comments published to #25 (6284903058), #26 (6284903549), #27 (6284903899), #28 (6284904264). No issue state changed. Final git status contains exactly the three pre-existing dirty files. Task dev/Worker servers stopped. No independent review performed.
