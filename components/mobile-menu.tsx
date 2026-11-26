"use client";

import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export function MobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="md:hidden">
    <button type="button" className="rounded-lg p-2" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Đóng menu" : "Mở menu"}>{open ? <X/> : <Menu/>}</button>
    {open && <nav id="mobile-navigation" aria-label="Điều hướng di động" onClick={(event) => {
      if ((event.target as HTMLElement).closest("a")) setOpen(false);
    }} className="absolute inset-x-0 top-full z-20 flex flex-col gap-4 border-b border-[#dfe9e2] bg-[#f7f8f4] px-5 py-5 text-sm font-semibold">{children}</nav>}
  </div>;
}
