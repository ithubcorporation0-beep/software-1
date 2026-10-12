import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT-HUB ERP — Enterprise Operations Suite",
  description:
    "Next-generation Enterprise Resource Planning platform for inventory, logistics, CRM, finance, and human capital.",
  keywords: ["ERP", "Enterprise", "Inventory", "Logistics", "SaaS", "Next.js"],
  authors: [{ name: "IT-HUB Engineering" }],
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        {children}
      </body>
    </html>
  );
}
