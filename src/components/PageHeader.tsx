"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/youtube": "YouTube",
  "/facebook": "Facebook",
  "/twitter": "Twitter",
  "/instagram": "Instagram",
  "/linkedin": "LinkedIn",
};

export default function PageHeader() {
  const pathname = usePathname();

  const pageName = useMemo(() => {
    return PAGE_NAMES[pathname] || "Page";
  }, [pathname]);

  return (
    <div className="fixed top-0 left-0 z-40 p-6">
      <Link href="/" className="inline-flex items-center gap-2 group">
        <h1
          className="text-sm md:text-base font-semibold transition-all duration-300 group-hover:translate-x-[-4px]"
          style={{ color: "var(--card-text)" }}>
          {pageName === "Home" ? (
            <span>any-video-downloader</span>
          ) : (
            <>
              <span className="opacity-50">any-video-downloader</span>
              <span className="mx-2">/</span>
              <span>{pageName}</span>
            </>
          )}
        </h1>
      </Link>
    </div>
  );
}
