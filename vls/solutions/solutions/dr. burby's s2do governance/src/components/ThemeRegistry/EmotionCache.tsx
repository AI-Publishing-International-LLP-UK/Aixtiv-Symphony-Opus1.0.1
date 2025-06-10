'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider as EmotionCacheProvider } from '@emotion/react';
import type { EmotionCache } from '@emotion/cache';

export type EmotionCacheProviderProps = {
  children: React.ReactNode;
  options?: Parameters<typeof createCache>[0];
};

/**
 * EmotionCache component for Next.js 14 App Router
 * 
 * This component ensures styles are properly extracted and injected during server-side rendering,
 * preventing style flashes when the page loads. It's specifically designed for the App Router
 * architecture in Next.js 14.
 */
export default function EmotionCacheProvider({
  children,
  options = { key: 'mui' },
}: EmotionCacheProviderProps) {
  // Initialize state to track all created emotion key-value entries
  const [{ cache, flush }] = React.useState(() => {
    // Create emotion cache on the client side
    const cache = createCache(options);
    
    // Extract all emotion styles when rendering on the server
    const prevInsert = cache.insert;
    let inserted: { name: string; styles: string }[] = [];
    
    // Override the insert method to capture all inserted styles
    cache.insert = (...args) => {
      const serialized = args[2];
      if (serialized.name !== undefined && !inserted.some(style => style.name === serialized.name)) {
        inserted.push({
          name: serialized.name,
          styles: serialized.styles,
        });
      }
      return prevInsert(...args);
    };
    
    // Function to get and reset the inserted styles
    const flush = () => {
      const prevInserted = [...inserted];
      inserted = [];
      return prevInserted;
    };
    
    return { cache, flush };
  });

  // Use Next.js hook to insert styles into the HTML stream during SSR
  useServerInsertedHTML(() => {
    const styles = flush();
    if (styles.length === 0) {
      return null;
    }
    
    // Render the styles as a style tag in the HTML
    return (
      <style
        data-emotion={`${options.key} ${styles.map(style => style.name).join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: styles.map(style => style.styles).join(' '),
        }}
      />
    );
  });

  // Provide the emotion cache to the rest of the application
  return <EmotionCacheProvider value={cache}>{children}</EmotionCacheProvider>;
}

