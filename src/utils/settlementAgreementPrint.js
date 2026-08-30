const copyCurrentFormValues = (root) => {
  root.querySelectorAll('input, textarea, select').forEach((field) => {
    if (field.tagName === 'SELECT') {
      Array.from(field.options).forEach((option) => option.toggleAttribute('selected', option.selected));
    } else if (field.type === 'checkbox' || field.type === 'radio') {
      field.toggleAttribute('checked', field.checked);
    } else {
      field.setAttribute('value', field.value);
      if (field.tagName === 'TEXTAREA') field.textContent = field.value;
    }
  });
};

export const openSettlementAgreementPrint = () => {
  const source = document.getElementById('settlement-agreement-print-area');
  if (!source) {
    window.print();
    return;
  }

  const printableRoot = source.cloneNode(true);
  copyCurrentFormValues(printableRoot);
  const reportWindow = window.open('', '_blank', 'width=1000,height=900');

  if (!reportWindow) {
    window.print();
    return;
  }

  const styles = Array.from(document.styleSheets).map((sheet) => {
    try {
      return sheet.href
        ? `<link rel="stylesheet" href="${sheet.href}">`
        : `<style>${Array.from(sheet.cssRules).map((rule) => rule.cssText).join('')}</style>`;
    } catch {
      return '';
    }
  }).join('');

  reportWindow.document.write(`<!doctype html><html><head><title>Settlement Agreement</title>${styles}<style>
    html, body { margin: 0; background: #e9eff7; }
    .preview-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 22px; background: #002b66; color: white; font: 700 12px Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    .preview-toolbar button { border: 0; border-radius: 6px; padding: 9px 14px; background: #ffd700; color: #002b66; font-weight: 800; cursor: pointer; }
    .print\\:hidden { display: none !important; }
    .hidden.print\\:block, .print\\:block { display: block !important; }
    .settlement-print-paper { width: min(210mm, calc(100% - 32px)); margin: 24px auto; padding: 18mm; background: white; box-shadow: 0 4px 20px #002b6626; }
    @media print { @page { size: A4; margin: 12mm; } html, body { background: white; } .preview-toolbar { display: none !important; } .settlement-print-paper { width: 210mm; min-height: 297mm; margin: 0; padding: 0; box-shadow: none; } }
  </style></head><body><div class="preview-toolbar"><span>Settlement Agreement Print Preview</span><button onclick="window.print()">Print Agreement</button></div><main class="settlement-print-paper">${printableRoot.outerHTML}</main></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
};
