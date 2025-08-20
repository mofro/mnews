import { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

export default class MyDocument extends React.Component {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <body className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
