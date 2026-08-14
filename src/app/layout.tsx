import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Product Research Dashboard',
  description: 'Dashboard untuk marketer dalam perencanaan produk',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
