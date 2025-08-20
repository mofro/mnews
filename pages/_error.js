import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

function Error({ statusCode }) {
  return (
    <div style={styles.container}>
      <Head>
        <title>{statusCode ? `Error ${statusCode}` : 'Client Error'}</title>
      </Head>
      <div style={styles.content}>
        <h1 style={styles.title}>
          {statusCode ? `Error ${statusCode}` : 'An error occurred'}
        </h1>
        <p style={styles.message}>
          {statusCode === 404
            ? 'The page you are looking for does not exist.'
            : 'An unexpected error has occurred.'}
        </p>
        <Link href="/" style={styles.link}>
          Go back home
        </Link>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, sans-serif',
  },
  content: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1rem',
    color: '#333',
  },
  message: {
    fontSize: '1.1rem',
    marginBottom: '1.5rem',
    color: '#666',
  },
  link: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#0070f3',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
};

export default Error;
