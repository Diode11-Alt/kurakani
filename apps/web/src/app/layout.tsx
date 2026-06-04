import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { OfflineDetector } from "../components/OfflineDetector";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Kurakani",
  description: "End-to-end encrypted messaging. Connect, share, and discover securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-body-lg antialiased`}>
          {children}
          <OfflineDetector />
          <Toaster position="top-center" toastOptions={{
            style: {
              background: '#ffffff',
              color: '#191c1e',
              border: '1px solid #e0e3e5',
              fontFamily: 'var(--font-inter)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }
          }} />
      </body>
    </html>
  );
}
