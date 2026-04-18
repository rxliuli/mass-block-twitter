// Prevents webextension-polyfill from throwing at import time when tests run
// in a plain playwright browser instead of a loaded extension.
;(globalThis as any).chrome ??= { runtime: { id: 'test' } }
