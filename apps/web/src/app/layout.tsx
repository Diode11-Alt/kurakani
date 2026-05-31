import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "GUFF — Connect, Share, Discover",
  description: "The social platform where conversations matter. Share posts, stories, and connect with people who get you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" toastOptions={{
          style: {
            background: 'var(--color-guff-surface-bright)',
            color: 'var(--color-guff-text)',
            border: '1px solid var(--color-guff-border)'
          }
        }} />
      </body>
    </html>
  );
}
