# Hồ sơ báo cáo UniLost

Trạng thái: khung báo cáo và đầu vào A0; **chưa phải báo cáo kết quả hoàn thành**.

## Thông tin và định dạng đã thống nhất

- Trường theo mẫu bìa: Đại học Công nghiệp Hà Nội — Trường Công nghệ thông tin và Truyền thông.
- Học phần: Thực tập cơ sở ngành. GVHD: Nguyễn Xuân Hoàng. Nhóm 2.
- Đề tài: HỆ THỐNG HỖ TRỢ TÌM KIẾM ĐỒ THẤT LẠC TRONG KHUÔN VIÊN TRƯỜNG UNILOST.
- Thành viên: Phùng Đức Anh, Vũ Xuân Trường, Vũ Minh Đức, Hoàng Minh Nhật. Lớp/khóa: chưa xác nhận; không tự điền. Không dùng GVHD/học phần hoặc dòng Bài kiểm tra 1 trong ảnh mẫu.
- A4, Times New Roman 13, giãn dòng 1,5; lề trái 3 cm, còn lại 2 cm. Đây là mặc định làm việc, không phải xác nhận quy định chính thức của trường.
- Bản xuất và minh chứng: `D:\Codex\outputs\unilost\`; tệp tải: `D:\Codex\downloads\unilost\`; tạm lớn: `D:\Codex\work\unilost\`. Nguồn tiếp tục ở repo.

## Dàn ý và thời điểm tích lũy

| Phần | Nội dung cần viết | Khi có đủ bằng chứng |
| --- | --- | --- |
| Bìa, lời mở đầu, mục lục | Bối cảnh, mục tiêu, giới hạn; danh mục hình/bảng và thuật ngữ | A0; hoàn thiện C3 |
| 1. Khảo sát và yêu cầu | Vấn đề, actor, yêu cầu chức năng/phi chức năng, phạm vi MVP; ma trận yêu cầu | A0/A4 |
| 2. Phân tích và thiết kế | Use case/đặc tả, activity/sequence/state, ERD/từ điển dữ liệu, ma trận quyền, kiến trúc | A4–A7, cập nhật A2/C1 |
| 3. Xây dựng hệ thống | Stack thực dùng, Auth/RLS, posts/ảnh, claim, matching, moderation; ảnh màn hình và giải pháp | Sau từng phiên code B/C |
| 4. Kiểm thử và đánh giá | Môi trường, fixture, test case, expected/actual, kết quả, lỗi còn lại; không dùng số liệu ước đoán | A9b/C2/C3 |
| Kết luận | Kết quả so mục tiêu, giới hạn còn lại và hướng phát triển | C3 |
| Tài liệu tham khảo và phụ lục | Nguồn trích dẫn thực dùng, phân công, hướng dẫn cài/chạy/sử dụng, test case và minh chứng | Tích lũy từng phiên; chốt C3 |

Mỗi hình có số, tên, nguồn và đoạn giải thích; nhãn **thiết kế dự kiến** cho luồng chưa triển khai. DOCX/PDF dùng mục lục tự động; kiểm tra trực quan hình/bảng/ngắt trang trước bàn giao. Không đặt số trang mục tiêu.

## Danh mục sơ đồ

| Hình | Nguồn | Nội dung | Phiên |
| --- | --- | --- | --- |
| 2.1 | [use-cases.puml](diagrams/use-cases.puml) | Use case tổng quan, actor và phạm vi mục tiêu | A0; A4 cập nhật |
| 2.2 | Sẽ tạo ở A4 | Activity gửi/xử lý claim | A4 |
| 2.3–2.4 | Sẽ tạo ở A6/A7 | Sequence tạo claim và chấp nhận với khóa/giao dịch | A6/A7 |
| 2.5–2.6 | Sẽ tạo ở A4/C1 | State diagram tin và claim | A4/C1 |
| 2.7 | Sẽ tạo ở A2/C1 | ERD, ràng buộc; kèm từ điển dữ liệu và quyền | A2/C1 |
| 2.8 | Sẽ tạo sau A1/A2 | Kiến trúc browser → server → Supabase | A1/A2 |
| 3.1 | Sẽ tạo ở C2/C3 | Triển khai Cloudflare và Supabase, biên secret/Auth | C2/C3 |

UML dùng PlantUML, ERD/kiến trúc dùng Mermaid. Giữ source có thể chỉnh sửa trong repo; xuất SVG/PNG đến thư mục output trước khi đưa vào báo cáo. Không gửi source chứa secret hoặc thông tin cá nhân đến dịch vụ render công khai.

Hình 2.1 đã render local bằng PlantUML 1.2025.2 và xem PNG ở A0: `D:\Codex\outputs\unilost\a0\use-cases.svg` / `use-cases.png`. Đây là bản xuất trên máy; clone repo ở máy khác cần render lại từ source.

## Truy vết và minh chứng

[Ma trận R01–R12](../baseline.md) là nguồn truy vết chung cho yêu cầu → issue → code → test/phiên; không sao chép thành bảng khác dễ lệch. [Use case](use-cases.md) là đặc tả mục tiêu, [test plan](../test-plan.md) là các nhóm kiểm tra. Mỗi phiên bổ sung bằng chứng thực chạy vào bảng dưới và progress.

| Minh chứng | Yêu cầu/issue | Code/phiên | Kiểm tra và kết quả | Tệp/commit |
| --- | --- | --- | --- | --- |
| E-A0 | R01, #6–#8, #10 | Baseline, đặc tả và sơ đồ A0 | Đọc tĩnh repo/GitHub; chưa là test runtime | Xem checkpoint A0 trong [progress](../progress.md) |

Khi có test: ghi tên test/lệnh, ngày, môi trường, expected/actual, pass/fail và commit. Ảnh/log chỉ dùng tài khoản giả, che email/token/proof. Không ghi secret vào repo. Không viết báo cáo rằng một yêu cầu đạt chỉ vì đã có giao diện hoặc policy SQL.
