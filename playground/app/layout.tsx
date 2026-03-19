import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tailwind to Inline — Playground',
  description:
    'Try tailwind-to-inline online. Convert HTML with Tailwind CSS classes to inline styles.',
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
