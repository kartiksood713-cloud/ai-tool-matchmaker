//import "./globals.css";

export const metadata = {
  title: "AI Tool Matchmaker",
  description: "Recommends best AI tools based on your use case",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
