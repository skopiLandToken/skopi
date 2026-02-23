import type { Metadata } from "next";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "SKOpi Portal",
  description: "SKOpi portal for sale, receipts, affiliates, and admin operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
