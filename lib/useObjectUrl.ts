"use client";

import { useEffect, useState } from "react";

/* A picked file as a blob: URL to show it by, revoked when the file
   changes or the component goes. Made in an effect rather than a memo with
   a separate revoke: in development React runs effects twice, and a revoke
   effect would then free the URL still in use, leaving a broken image.
   "" until it's ready. */
export function useObjectUrl(file: File): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
