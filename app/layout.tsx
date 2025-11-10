import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext"; // 1. IMPORT CART PROVIDER
import { ThriftCartProvider } from "../lib/ThriftCartContext"; // <-- FIXED PATH

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Maestro App",
  description: "Food, Thrift, and Gaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <ThriftCartProvider> {/* 2. WRAP THE APP IN THE THRIFT CART */}
              {children}
            </ThriftCartProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}