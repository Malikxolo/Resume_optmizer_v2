/**
 * Global Configuration
 * Returns the backend API base URL from process.env.NEXT_PUBLIC_API_URL or defaults to empty string for relative proxying.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
