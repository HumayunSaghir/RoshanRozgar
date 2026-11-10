'use client';

// Last-resort boundary: renders its own <html> because the root layout failed.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8f6e0', fontFamily: 'system-ui, sans-serif', color: '#232323', textAlign: 'center', padding: 24 }}>
        <div>
          <p style={{ fontSize: 80, fontWeight: 700, color: '#0e4b35', margin: 0 }}>500</p>
          <h1 style={{ margin: '8px 0' }}>Something went wrong</h1>
          <p style={{ color: '#585858' }}>RoshanRozgar hit an unexpected problem. Please reload the page.</p>
          <button type="button" onClick={reset} style={{ cursor: 'pointer', marginTop: 16, height: 52, padding: '0 28px', borderRadius: 999, border: 0, background: '#0e4b35', color: '#fff', fontWeight: 700, fontSize: 16 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
