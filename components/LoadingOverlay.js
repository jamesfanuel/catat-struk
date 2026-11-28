'use client';

export default function LoadingOverlay({
  id,
  visible = true,
  fading = false,
  text = 'Memuat…',
  ariaLabel = 'Memuat',
  hiddenByDefault = false,
}) {
  if (!visible && !hiddenByDefault) return null;

  const classes = [
    'login-loading-overlay',
    hiddenByDefault ? 'hidden' : '',
    fading ? 'login-loading-fadeout' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div id={id} className={classes} aria-live="polite" aria-label={ariaLabel}>
      <div className="login-loading-inner">
        <div className="login-spinner-wrap">
          <svg className="login-spinner" viewBox="0 0 50 50" width="52" height="52">
            <circle className="spinner-track" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
            <circle className="spinner-head" cx="25" cy="25" r="20" fill="none" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="login-spinner-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8M8 11h8M8 15h5" />
            </svg>
          </div>
        </div>
        <p className="login-loading-text" id={id ? `${id.replace('-overlay', '')}-text` : undefined}>
          {text}
        </p>
        <div className="login-loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}
