import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Docs Jam Leaderboard',
  description: 'Track contributions to DeepL API documentation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}

