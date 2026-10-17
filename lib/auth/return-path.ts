export function safeAuthReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/u.test(value)) return "/";
  try {
    const url = new URL(value, "https://app.local");
    const pathname = decodeURIComponent(url.pathname);
    if (url.origin !== "https://app.local" || pathname.startsWith("//") || /[\\\u0000-\u001f\u007f]/u.test(pathname)) return "/";
    if (/^\/(?:auth|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
