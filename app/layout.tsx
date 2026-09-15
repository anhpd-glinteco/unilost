import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default: "UniLost · Tìm lại đồ thất lạc", template: "%s · UniLost" }, description: "Cộng đồng tìm kiếm đồ thất lạc trong khuôn viên trường.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi"><body>{children}</body></html>; }
