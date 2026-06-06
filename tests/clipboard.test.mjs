import assert from 'node:assert/strict';
import test from 'node:test';

import { readClipboardText, writeClipboardText } from '../src/share/clipboard.mjs';

test('clipboard helper writes text through the browser Clipboard API', async () => {
  const calls = [];
  const clipboard = {
    writeText: async (text) => calls.push(text),
  };

  await writeClipboardText('setup-json', { clipboard });

  assert.deepEqual(calls, ['setup-json']);
});

test('clipboard helper falls back to a temporary textarea when Clipboard API copy is unavailable', async () => {
  const removed = [];
  const selected = [];
  const textarea = {
    value: '',
    setAttribute() {},
    style: {},
    select: () => selected.push(textarea.value),
    remove: () => removed.push(textarea.value),
  };
  const document = {
    body: {
      append: (element) => assert.equal(element, textarea),
    },
    createElement: (tag) => {
      assert.equal(tag, 'textarea');
      return textarea;
    },
    execCommand: (command) => {
      assert.equal(command, 'copy');
      return true;
    },
  };

  await writeClipboardText('fallback setup', { clipboard: {}, document });

  assert.deepEqual(selected, ['fallback setup']);
  assert.deepEqual(removed, ['fallback setup']);
});

test('clipboard helper reads text through the browser Clipboard API', async () => {
  const clipboard = {
    readText: async () => 'shared setup',
  };

  assert.equal(await readClipboardText({ clipboard }), 'shared setup');
});

test('clipboard helper reports unsupported paste access clearly', async () => {
  await assert.rejects(
    () => readClipboardText({ clipboard: {} }),
    /Clipboard paste is not available/,
  );
});
