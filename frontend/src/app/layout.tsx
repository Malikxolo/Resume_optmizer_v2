import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Optimizer v2 | AI-Powered Resume Scoring & Refinement",
  description:
    "Optimize your resume against any job description with dual ATS + AI screening scores, annotated issue detection, and conversational refinement — powered by Gemini 3.6 Flash.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
