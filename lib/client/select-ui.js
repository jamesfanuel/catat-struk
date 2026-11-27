const enhancedSelects = new WeakMap();

export function syncSelectUI(selectEl) {
  const api = enhancedSelects.get(selectEl);
  if (api) api.sync();
}

export function enhanceSelect(selectEl, { compact = false } = {}) {
  if (!selectEl) return;
  if (enhancedSelects.has(selectEl)) {
    syncSelectUI(selectEl);
    return;
  }

  selectEl.classList.add('native-select-hidden');

  const wrap = document.createElement('div');
  wrap.className = `custom-select${compact ? ' compact' : ''}`;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const left = document.createElement('span');
  left.className = 'custom-select-left';
  const labelSpan = document.createElement('span');
  labelSpan.className = 'custom-select-label';
  left.appendChild(labelSpan);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'custom-select-chevron');
  chevron.setAttribute('width', compact ? '15' : '18');
  chevron.setAttribute('height', compact ? '15' : '18');
  chevron.setAttribute('viewBox', '0 0 24 24');
  chevron.setAttribute('fill', 'none');
  chevron.setAttribute('stroke', 'currentColor');
  chevron.setAttribute('stroke-width', '2.2');
  chevron.setAttribute('stroke-linecap', 'round');
  chevron.setAttribute('stroke-linejoin', 'round');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', '6 9 12 15 18 9');
  chevron.appendChild(poly);

  trigger.append(left, chevron);

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu hidden';
  menu.setAttribute('role', 'listbox');

  wrap.append(trigger, menu);
  selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);

  function closeMenu() {
    wrap.classList.remove('open');
    menu.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function rebuildOptions() {
    menu.innerHTML = '';
    const opts = Array.from(selectEl.options);
    opts.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `custom-select-option${opt.selected ? ' selected' : ''}`;
      btn.dataset.value = opt.value;
      btn.disabled = opt.disabled;

      const textWrap = document.createElement('span');
      textWrap.className = 'custom-option-text';
      const title = document.createElement('strong');
      title.textContent = opt.textContent;
      textWrap.appendChild(title);

      const check = document.createElement('span');
      check.className = 'custom-option-check';
      check.textContent = '✓';

      btn.append(textWrap, check);
      btn.addEventListener('click', () => {
        if (selectEl.value !== opt.value) {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncSelection();
        closeMenu();
      });
      menu.appendChild(btn);
    });
    syncSelection();
  }

  function syncSelection() {
    const selectedOpt = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
    labelSpan.textContent = selectedOpt ? selectedOpt.textContent : '-';
    menu.querySelectorAll('.custom-select-option').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.value === selectEl.value);
    });
    wrap.classList.toggle('hidden', selectEl.classList.contains('hidden'));
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = menu.classList.contains('hidden');
    document.querySelectorAll('.custom-select.open').forEach((other) => {
      if (other !== wrap) {
        other.classList.remove('open');
        other.querySelector('.custom-select-menu')?.classList.add('hidden');
        other.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
    wrap.classList.toggle('open', willOpen);
    menu.classList.toggle('hidden', !willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeMenu();
  });

  selectEl.addEventListener('change', syncSelection);

  const observer = new MutationObserver(() => rebuildOptions());
  observer.observe(selectEl, { childList: true, attributes: true, attributeFilter: ['class'] });

  enhancedSelects.set(selectEl, { sync: rebuildOptions });
  rebuildOptions();
}

export function enhanceAllSelects(root = document) {
  root.querySelectorAll('select').forEach((sel) => {
    const compact = sel.classList.contains('mini-select') || sel.classList.contains('month-select');
    enhanceSelect(sel, { compact });
  });
}
