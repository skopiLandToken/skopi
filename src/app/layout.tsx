import "./globals.css";
import Nav from "./components/Nav";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SKOpi Portal",
  description: "Buy SKOpi, track purchases, and manage marketing partner earnings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Nav />
          <main className="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
