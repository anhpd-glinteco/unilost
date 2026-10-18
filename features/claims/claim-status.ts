import type { ClaimStatus } from "@/lib/types";

export const claimStatusLabels: Record<ClaimStatus, string> = {
  pending: "Chờ xử lý", accepted: "Đã chấp nhận", rejected: "Đã từ chối", cancelled: "Đã hủy", completed: "Đã hoàn trả",
};
