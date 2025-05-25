import React from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '../theme/ThemeProvider';
import NextAppDirEmotionCacheProvider from './EmotionCache';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
}

export default MyApp;

