'use client';

export default function ModalShell({
  id,
  titleId,
  title,
  badge = '',
  size = '',
  closeId,
  hideClose = false,
  children,
}) {
  const sheetClass = ['modal-sheet', size === 'lg' ? 'modal-lg' : size === 'compact' ? 'modal-compact' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div id={id} className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby={titleId || `${id}-title`}>
      <div className="modal-backdrop" data-close={id}></div>
      <div className={sheetClass}>
        <div className="modal-header">
          <div>
            {badge && <span className="auth-badge">{badge}</span>}
            <h3 id={titleId || `${id}-title`}>{title}</h3>
          </div>
          {!hideClose && (
            <button type="button" id={closeId} className="icon-btn" data-close={id} aria-label="Close">
              &times;
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
