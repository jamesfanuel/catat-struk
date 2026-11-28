'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reusable animated dropdown replacing native OS <select> popups.
 * Uses Tailwind-style scale + fade + translate transitions defined in globals.css.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  compact = false,
  ariaLabel,
  className = '',
  placeholder = '-',
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`custom-select${compact ? ' compact' : ''}${open ? ' open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <span className="custom-select-left">
          <span className="custom-select-label">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <svg
          className="custom-select-chevron"
          width={compact ? '15' : '18'}
          height={compact ? '15' : '18'}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="custom-select-menu" role="listbox" aria-hidden={!open}>
        {options.map((opt) => {
          const isSelected = String(opt.value) === String(value);
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={Boolean(opt.disabled)}
              className={`custom-select-option${isSelected ? ' selected' : ''}`}
              onClick={() => {
                if (onChange && String(opt.value) !== String(value)) {
                  onChange(opt.value);
                }
                setOpen(false);
              }}
            >
              <span className="custom-option-text">
                <strong>{opt.label}</strong>
              </span>
              <span className="custom-option-check" aria-hidden="true">✓</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
