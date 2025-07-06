import * as React from 'react';
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import ThemeRegistry from '../components/ThemeRegistry/ThemeRegistry';
import './globals.css';

// Font configuration
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

// Metadata configuration
export const metadata: Metadata = {
  title: {
    template: '%s | S2DO Governance',
    default: 'S2DO Governance - Dr. Burby',
  },
  description: 'A governance solution for sustainable development objectives',
  keywords: ['governance', 'sustainability', 'S2DO', 'Aixtiv Symphony'],
  authors: [
    {
      name: 'Dr. Burby',
      url: 'https://aixtiv-symphony-opus1.com',
    },
  ],
  creator: 'Aixtiv Symphony Opus1',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

/**
 * Root layout component for the Next.js 14 App Router
 * This wraps the entire application with the ThemeRegistry for consistent styling
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${robotoMono.variable} font-sans antialiased`}>
        <ThemeRegistry>
          {/* Skip navigation for accessibility */}
          <a
            href="#main-content"
            className="fixed top-0 left-0 p-2 bg-primary text-white transform -translate-y-full focus:translate-y-0 z-50"
          >
            Skip to main content
          </a>
          
          {/* Main content */}
          <div id="main-content">
            {children}
          </div>
        </ThemeRegistry>
      </body>
    </html>
  );
}
