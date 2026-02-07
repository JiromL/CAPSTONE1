import { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reservation Management System",
  description: "A modern reservation management system with AI chatbot support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
