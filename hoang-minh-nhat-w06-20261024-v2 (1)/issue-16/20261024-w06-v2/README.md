# Hoàng Minh Nhật — #16, kiểm thử UI ảnh B1f

Trạng thái: **đã đóng gói; chờ frontend tiền nhiệm được commit, chờ thành viên review/commit/push/PR**. Issue #16 vẫn OPEN. #28 được bàn giao riêng bằng hồ sơ minh chứng, không nhận phần test ảnh là hoàn tất claim Tuần 6.

## Base và phụ thuộc bắt buộc

Base chính xác: `e03017416bb5adbc3fb764df037bfd5e0eddd2d8` (PR #63, `feature/unilost-post-image-storage`). Tiền nhiệm trực tiếp mới: `feature/unilost-post-image-ui`, hiện chưa commit. Bản `dependencies/frontend-issue-13.patch` là phụ thuộc để **tái lập kiểm tra**, chứa frontend của Phùng Đức Anh; không phải code để Nhật nhận tác giả hoặc commit hộ. Không có SHA frontend để ghi trước khi nó thật sự được commit.

`code.patch` chỉ có unit tests, test fixture bridge, bốn ảnh tổng hợp nhỏ, tests README và runbook. Không có ứng dụng frontend, migration, quyền DB, env hoặc secret trong patch này. Manifest/path allowlist đi kèm.

## Áp dụng thử trong checkout riêng

```powershell
git worktree add -b test/issue-16-image-ui-replay D:/Codex/work/unilost-issue16-review-v2 e03017416bb5adbc3fb764df037bfd5e0eddd2d8
Set-Location D:/Codex/work/unilost-issue16-review-v2
$package='D:/Codex/outputs/unilost/member-handoff/hoang-minh-nhat/issue-16/20261024-w06-v2'
$env:NODE_OPTIONS='--max-old-space-size=768'
git apply --check "$package/dependencies/frontend-issue-13.patch"
git apply "$package/dependencies/frontend-issue-13.patch"
git apply --check "$package/code.patch"
git apply "$package/code.patch"
npm ci
node --max-old-space-size=768 node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism
npm run typecheck
npm run lint
npm run build
```

Không chạy các lệnh này trong checkout có sửa dở. Để commit/PR thật, đợi Phùng Đức Anh commit frontend tiền nhiệm, tạo nhánh `test/issue-16-image-ui` từ **SHA frontend đã công bố**, chỉ apply `code.patch`, kiểm tra lại base/diff và stage đúng danh sách QA trong `owned-paths.json`. Không commit cả dependency patch vào nhánh QA trên base #63. PR hướng về nhánh frontend tiền nhiệm.

## Kiểm tra và giới hạn

Xem `VERIFICATION.md` và evidence trong gói. Browser local dev + Supabase test: 43 assertions được ghi, có ảnh desktop/mobile, cleanup/readback PASS. Bridge có smoke ở source cuối và unit chặn sai target. Runbook `tests/e2e/post-image-ui.md` dùng dữ liệu giả, không replay migration. Không đính kèm `fixture-control.json` hoặc test env. Máy nhận tự cấu hình env đúng project test ngoài Git.

Giữ các lần thất bại trong diagnostics. Mất body sau header: UI khóa/không tự retry; mất toàn bộ header có thể khiến Chromium truyền lại PUT, nên không cam kết exactly-once. Auth được thu hồi bằng ban tài khoản fixture, không phải đo JWT hết hạn theo đồng hồ. Review độc lập BLOCKED và CI của code mới NOT_RUN vì chưa publish; Sheet/production không nghiệm thu.

Mốc đọc/base: `e03017416bb5adbc3fb764df037bfd5e0eddd2d8` — PR #63, nhánh `feature/unilost-post-image-storage`, tiền nhiệm trực tiếp của UI ảnh `feature/unilost-post-image-ui` (chưa commit). Chuỗi PR hiện có giữ nguyên base/head; xem snapshot `prs.json` trong checkpoint. Không lấy main làm base vì main chưa chứa chuỗi PR này.

Tác giả phần bổ sung: Codex thực hiện cùng Phùng Đức Anh trong phiên 24/10. Người nhận là người phụ trách tiếp nhận/review và tự commit/push; chưa có review hay commit của thành viên trong phiên. Không nhận lại công lao tác giả của PR đã tồn tại.

Không có commit/push/PR/issue update/Sheet/merge/deploy mới. Kết quả local, fixture, CI head cũ và production được phân biệt. Chỉ đánh dấu hoàn tất issue sau đầy đủ nghiệm thu; review độc lập và tổng hợp tuần vẫn chờ.

Nguồn: [Issue #16](https://github.com/anhpd-glinteco/unilost/issues/16), [PR #63](https://github.com/anhpd-glinteco/unilost/pull/63).
