// App theme: 'light' (olive green, default) or 'dark'. Stored per-browser and
// applied by toggling the `dark` class on <html> (see dark overrides in index.css).
const KEY = 'naansense-theme'

export function getTheme() {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

export function applyTheme(theme) {
  const dark = theme === 'dark'
  try { document.documentElement.classList.toggle('dark', dark) } catch { /* ignore */ }
  try { localStorage.setItem(KEY, dark ? 'dark' : 'light') } catch { /* ignore */ }
}

export function initTheme() { applyTheme(getTheme()) }
