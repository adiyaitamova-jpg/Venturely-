// The product UI is a single client page served from /app.html; this layout only exists for Next's route handlers.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
