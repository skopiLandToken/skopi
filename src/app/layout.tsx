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
      <head>
        <script defer src="https://analytics.skopi.io/script.js" data-website-id="a51a7fc2-bcfa-4ee9-9282-44d11d2b1748"></script>
      </head>
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
