/**
 * Runs before first paint so reveal styles only apply when JS is available.
 * Its SHA-256 hash is allow-listed in the CSP in vercel.json; a unit test keeps them in sync.
 */
export const JS_FLAG_SCRIPT = "document.documentElement.classList.add('js')";
