"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/src/app/sw";

export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
