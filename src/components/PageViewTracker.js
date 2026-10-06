"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackUsageEvent } from "@/lib/usageAnalytics";

export default function PageViewTracker() {
  const pathname = usePathname();
  const previousPath = useRef(null);
  useEffect(() => {
    if (!pathname || previousPath.current === pathname) return;
    void trackUsageEvent("page_view", { previous_path: previousPath.current });
    previousPath.current = pathname;
  }, [pathname]);
  return null;
}
