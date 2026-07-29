/**
 * Global Configuration
 * Returns the backend API base URL from process.env.NEXT_PUBLIC_API_URL or defaults to empty string for relative proxying.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "");
