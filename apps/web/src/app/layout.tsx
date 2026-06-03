import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora, Space_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { OfflineDetector } from "../components/OfflineDetector";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "600", "700", "800"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "GUFF — The Signal Fire",
  description: "End-to-end encrypted messaging. Connect, share, and discover securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${jakarta.variable} ${sora.variable} ${spaceMono.variable} antialiased`}>
          {children}
          <OfflineDetector />
          <Toaster position="top-center" toastOptions={{
            style: {
              background: '#1C1816',
              color: '#F5F0EB',
              border: '1px solid #4A3D33',
              fontFamily: 'var(--font-jakarta)',
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.1)',
            }
          }} />
      </body>
    </html>
  );
}
