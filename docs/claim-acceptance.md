# A9b — Nghiệm thu claim Tuần 6

Ngày chạy: 20/10/2026 (Asia/Saigon). Nền: A9a `0f582d0`, [PR #57](https://github.com/anhpd-glinteco/unilost/pull/57). Đây là nghiệm thu fixture trên Supabase test riêng và hai runtime local, không phải nghiệm thu production.

## Phạm vi và cách tái chạy

Không đổi API, migration, grants hoặc dependency. Tái sử dụng runner REST A2–A7, browser A8a/A8b/A9a; bổ sung journey tạo tin qua UI, xuất bản bằng API quản trị fixture, gửi claim và xử lý qua UI. Phiên đăng nhập dùng password fixture và cookie Supabase; không thực hiện đăng nhập email PKCE mới. Feed/tìm kiếm thật, UI duyệt tin và hoàn trả không thuộc journey này.

Minh chứng gốc nằm ngoài Git tại `D:/Codex/outputs/unilost/a9b/`; script replay tại `D:/Codex/work/unilost/a9b/`. Credentials giữ trong env test ngoài Git. Người rà soát cần nhận bộ minh chứng local để kiểm tra hash/ảnh; liên kết PR không tự cung cấp các artifact local này.

```powershell
node --max-old-space-size=512 node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism
node --max-old-space-size=512 node_modules/typescript/bin/tsc --noEmit
node --max-old-space-size=512 node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next
$env:NODE_OPTIONS='--max-old-space-size=512'
npm run build
node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/test-permissions.mjs
```

Chạy browser tuần tự khi app ở `http://localhost:5173`, trước với `npm run dev`, sau đó dừng dev và chạy `npm run start -- --port 5173`. Đặt `A9B_MODE=dev` hoặc `worker` và `A9A_MODE` tương ứng để phân biệt đầu ra; chạy `journey.mjs`, `a8a-browser.mjs`, `a8b-browser.mjs`, `a9a-browser.mjs` trong thư mục replay. Không chạy hai server trên cùng port, không chạy hai bản cùng harness đồng thời. Harness chỉ chấp nhận đúng project test đã chốt; dừng nếu target/config lệch, không tự migration.

## Truy vết nghiệm thu

| Yêu cầu | Issue | Kiểm tra mới trong A9b | Minh chứng |
| --- | --- | --- | --- |
| Tạo found pending → xuất bản fixture → gửi → hai danh sách → accept | #25, #27, #28 | Journey UI và readback claim/tin/đúng một lịch sử | `{dev,worker}-journey-summary.json`, ảnh journey |
| Guest/requester/owner/stranger/admin; không đọc proof trái phép | #26, #28 | REST đọc trực tiếp/lồng và browser đổi phiên, admin scoped, payload riêng tư | `hosted-rest.log`, `{dev,worker}-a8b/browser-summary.json` |
| Giả danh, tự nâng quyền, tự claim, ghi trực tiếp, trùng/không đủ điều kiện | #26, #27, #28 | Runner REST/RPC theo actor, giữ quyền bảng/cột | `hosted-rest.log` |
| Hủy/từ chối trên tin ẩn/xóa; accept matched/searching; trạng thái cuối | #25, #27, #28 | A8a/A9a browser, đối chiếu post/history/claim khác | `{dev,worker}-a9a/*-browser-summary.json` |
| Hai accept và accept–cancel cạnh tranh; không ghi dở | #27, #28 | REST ba biến thể tranh chấp, browser action cạnh tranh RPC | `hosted-rest.log`, `{dev,worker}-a9a/*-browser-summary.json` |
| Gửi lặp, lỗi validation, hết phiên, stale/mất phản hồi sau commit | #25, #28 | Khóa pending, một action, readback an toàn, reload không retry mutation | `{dev,worker}-a8a/browser-summary.json`, `{dev,worker}-a9a/*-browser-summary.json` |
| Phân trang, proof escape, keyboard/focus, mobile/desktop | #25, #28 | A8b/A9a browser, 1086/390×844 DPR1, không tràn ngang | Summary và PNG trong hai thư mục browser tương ứng |
| Hồi quy, build và dọn fixture | #25–#28 | Unit/types/lint/build; cleanup/readback mỗi runner | Log tương ứng, `verification.json`, `manifest.json` |

Browser cạnh tranh là UI action với RPC của phiên cạnh tranh, không phải hai người bấm ở hai trình duyệt và không phải kiểm thử tải. SQL cố tình gây lỗi ghi lịch sử để chứng minh rollback ở A7 là minh chứng lịch sử, không tính là lượt SQL mới của A9b.

## Điều kiện bàn giao

Kết quả mới ngày 20/10: **307/307 unit**, typecheck/lint/build, **558 hosted checks**, **43 nhóm browser dev + 43 nhóm Worker local PASS**. Mỗi runtime gồm journey 5, form 13, lists 13, decisions 12; tất cả lượt cuối xác nhận cleanup. Không phát hiện lỗi sản phẩm. Một lượt form Worker thất bại do assertion URL chạy trước điều hướng; giữ `worker-a8a/attempt1-navigation-race.log`, thêm chờ pathname đăng nhập rồi chạy lại cùng kiểm tra `next`, đạt. Dev chạy trước bổ sung wait; assertion nghiệp vụ không đổi. Đã xem trực quan dialog mobile dev và danh sách mobile Worker.

Kết quả thực chạy và giới hạn được ghi tại checkpoint A9b trong [progress](progress.md) và `verification.md` ngoài Git. Chỉ ghi PASS sau exit 0 cùng cleanup; giữ lại lỗi harness nếu có và giải thích lượt chạy lại. Manifest liên kết hash mã nguồn, script và artifact; CI phải gắn đúng commit PR.

Review độc lập còn thiếu: người khác cần rà soát PR và bộ minh chứng; tự rà soát của tác giả không thay thế review độc lập. Không sửa Sheet. #25/#27/#28 giữ OPEN khi chưa đủ toàn bộ nghiệm thu, gồm tổng hợp Tuần 6 dòng 15. #26 đã CLOSED từ A5; A9b bổ sung kết quả hồi quy, không mở lại hoặc nhận là đóng mới. Production HTTPS/cookie Secure, fresh email PKCE và C1 chưa kiểm chứng.
