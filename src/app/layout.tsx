import "./globals.css";
import Nav from "./components/Nav";

export const metadata = {
  title: "SKOpi Portal",
  description: "Buy SKOpi, track purchases, and manage affiliate earnings.",
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
