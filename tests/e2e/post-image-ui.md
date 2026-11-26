# B1f: kiểm thử UI ảnh (#16), nối UI #13 / API #63

Chạy trên checkout riêng, base `e03017416bb5adbc3fb764df037bfd5e0eddd2d8` (PR #63), áp dụng patch frontend tiền nhiệm rồi patch kiểm thử. Không áp dụng migration, không dùng production. Cần migration 0009 đã có trên project test `lsaukzzmwbsztnlcrdpk`. Tất cả ảnh ở `tests/fixtures/post-images/` là ảnh màu tổng hợp, không chứa dữ liệu cá nhân.

## Chuẩn bị

1. `npm ci` nếu chưa có dependencies. Chạy unit/typecheck/lint/build theo package.json. Đặt `.env.local` ignored của checkout riêng với URL/anon/service key của đúng project test; không chia sẻ tệp này. Giữ secret service phía server. Không sao chép key vào browser.
2. Chạy `npm run dev -- --port 5194` ở checkout riêng. Chờ URL sẵn sàng.
3. Terminal khác, cung cấp env test ngoài Git và chạy:

```powershell
$env:B1F_APP_ORIGIN='http://localhost:5194'
$env:B1F_FIXTURE_PORT='5195'
$env:B1F_OUTPUT='D:/Codex/work/unilost/b1f-replay'
node --env-file=D:/Codex/work/unilost/a2/supabase-test.env scripts/post-image-ui-fixture.mjs
```

Bridge chỉ bind localhost và chỉ cho phép project test đã định danh. Nó tạo bốn tài khoản/fixture giả, cung cấp phiên test qua HTTP cookie và proxy app local; không kiểm tra email PKCE. Cổng 5195 chỉ phục vụ kiểm thử, không triển khai bridge. `fixture-control.json` chứa khóa điều khiển tạm và ID fixture: giữ ở work, không đính kèm gói/PR.

4. Trong terminal điều khiển, đọc tệp local và gọi các lệnh fixture (không đưa khóa vào chat/log):

```powershell
$fixture = Get-Content D:/Codex/work/unilost/b1f-replay/fixture-control.json | ConvertFrom-Json
function Fixture($operation, $id) {
  $body = @{operation=$operation}
  if ($id) { $body.id=$id }
  Invoke-RestMethod http://localhost:5195/__fixture/control -Method Post -Headers @{'x-fixture-control'=$fixture.controlKey} -ContentType application/json -Body ($body | ConvertTo-Json)
}
Fixture read
```

## Ma trận browser

Dùng browser thật, viewport desktop 1086×844 và mobile 390×844, ghi DPR thực tế, chờ ảnh decode và dialog đóng xong trước assert focus. Đọc trạng thái UI sau mỗi thao tác; chờ hành vi thay vì sleep/retry mutation.

| Ca | Thao tác và kỳ vọng |
|---|---|
| Tạo → ảnh | Mở `/__fixture/login?actor=owner`, tạo tin có tiêu đề bắt đầu `B1f ` qua form. Có mã tin trước khi thêm ảnh. `Fixture register-created <id>` giúp đối chiếu request/readback. Chọn red.png trong inputs, có preview chưa tải; upload thành công, có một metadata và tin pending. |
| Validation | Chọn invalid.txt, empty.png, large.png: có lỗi, không có nút upload và không có PUT mới. Chọn lại cùng một file được sau bỏ chọn. |
| Hủy preview | Chọn ảnh rồi Bỏ chọn ảnh: không gửi request, ảnh đã lưu vẫn hiện. |
| Thay ảnh | `Fixture publish <id>`, thay red.png (320px) bằng blue.png (240px). Chờ ảnh decode, naturalWidth đổi; DB pending, không cần reload để đổi bytes. |
| Định dạng | Upload valid.jpg (160px) và valid.webp (180px); preview/ảnh lưu decode được. |
| Gửi lặp | `Fixture delay-next`, double-click upload: một PUT. Controls bị khóa trong lúc xử lý. |
| Xóa | Mở dialog, Escape/Quay lại không DELETE, focus trả về Xóa ảnh sau transition. Xác nhận tạo một DELETE; metadata trống và ảnh biến mất. |
| Mất body sau commit | `Fixture drop-next`, upload: bridge chuyển request thật tới app, nhận kết quả rồi cắt body JSON. UI báo chưa xác nhận, khóa chọn/upload/xóa, không báo thành công; một PUT ở summary. Link Tải lại tin mở đúng `/posts/<id>` cả khi xuất phát từ form tạo tin; ảnh đã ghi hiện ra, không có success giả từ readback. |
| Quyền | Với fixture found published, lần lượt `/__fixture/login?actor=guest`, `stranger`, `admin`: thấy tin/ảnh, không có input quản lý. Owner có input ở searching/matched; fixture terminal không có input. |
| Lost/hidden | Owner mở fixture lost (hidden/matched), upload ảnh; vẫn hidden. Guest/stranger không đọc được tin hidden. |
| Phiên bị thu hồi | Login actor=expired, mở fixture expiry, chọn ảnh; chạy `Fixture expire` (ban đúng tài khoản giả này trong 24 giờ để Auth từ chối), upload trả lỗi/khóa và không tạo ảnh. |
| Responsive | Không tràn ngang, ảnh co trong vùng chứa, dialog nằm trong viewport, keyboard đi tới controls. Chụp desktop/mobile/dialog/lỗi và kiểm tra ảnh trực tiếp. |

Giới hạn đã quan sát: nếu ngắt socket hoàn toàn **trước header**, Chromium có thể tự truyền lại PUT theo semantics HTTP idempotent. Ứng dụng không có retry loop nhưng API hiện chưa có idempotency key, nên không cam kết exactly-once ở tầng transport. `drop-next` cố ý trả header rồi cắt body để đo cơ chế xử lý kết quả chưa xác nhận của ứng dụng. Không gán kết quả này cho mọi kiểu mất mạng.

## Dọn và kiểm tra

Chạy `Fixture cleanup`, chờ terminal bridge in `Fixture cleanup PASS`, xem `fixture-summary.json`. Bridge xóa objects đã theo dõi, toàn bộ posts của các actor riêng của lượt chạy, claims/history/metadata cascade và bốn Auth/profile; đọc lại xác nhận vắng mặt. Ctrl+C cũng chạy cleanup; không đóng cưỡng bức khi chưa có readback. Nếu cleanup FAIL, giữ summary và đối soát chỉ ID/path của lượt chạy; không thử xóa dữ liệu khác. Tệp fixture-control/key phải được giữ local rồi xóa sau khi xong.

Dừng đúng app của lượt chạy, xóa env secret trong checkout riêng. Không chạy hosted migration/SQL suite chỉ để verify patch. Kết quả browser local + Supabase test không chứng minh production/PKCE/tải hoặc review độc lập.
