import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MiniBlog | A Twitter-like Microblogging Platform',
  description: 'Share your thoughts in 500 characters or less',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
