function browserClipboard() {
  return globalThis.navigator?.clipboard;
}

function browserDocument() {
  return globalThis.document;
}

function copyWithTextarea(text, document) {
  if (typeof document?.execCommand !== 'function' || !document?.body) {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  return copied;
}

export async function writeClipboardText(text, { clipboard = browserClipboard(), document = browserDocument() } = {}) {
  if (typeof clipboard?.writeText === 'function') {
    await clipboard.writeText(text);
    return;
  }

  if (!copyWithTextarea(text, document)) {
    throw new Error('Clipboard copy is not available in this browser.');
  }
}

export async function readClipboardText({ clipboard = browserClipboard() } = {}) {
  if (typeof clipboard?.readText !== 'function') {
    throw new Error('Clipboard paste is not available in this browser.');
  }

  return clipboard.readText();
}
