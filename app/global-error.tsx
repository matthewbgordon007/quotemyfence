'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, background: '#f8fafc' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, color: '#0f172a', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 24 }}>A client-side error occurred. Please try again.</p>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              background: '#2563eb',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
