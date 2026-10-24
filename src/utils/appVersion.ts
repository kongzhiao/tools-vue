const VERSION_PATTERN = /^\d{12}$/;
const CHECK_INTERVAL = 60_000;
let started = false;

export const getBuildVersion = (): string => {
  if (typeof document === 'undefined') return '';
  const version = document.querySelector<HTMLMetaElement>('meta[name="app-build-version"]')?.content || '';
  return VERSION_PATTERN.test(version) ? version : '';
};

export const withBuildVersion = (href: string, version: string): string => {
  const url = new URL(href);
  url.searchParams.set('r', version);
  return url.href;
};

export const syncBuildVersionInUrl = () => {
  const version = getBuildVersion();
  if (!version) return;
  const href = withBuildVersion(window.location.href, version);
  if (href !== window.location.href) {
    // 仅补充地址版本，不触发路由重渲染和额外业务请求。
    window.history.replaceState(window.history.state, '', href);
  }
};

export const startBuildVersionCheck = (onUpdate: (version: string) => void) => {
  const currentVersion = getBuildVersion();
  if (started || !currentVersion) return;
  started = true;
  let checking = false;
  let lastCheckedAt = 0;
  let notifiedVersion = '';

  const check = async () => {
    if (checking || document.visibilityState === 'hidden' || Date.now() - lastCheckedAt < 30_000) return;
    checking = true;
    lastCheckedAt = Date.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data: { version?: unknown } = await response.json();
      if (typeof data.version !== 'string' || !VERSION_PATTERN.test(data.version)) return;
      if (data.version !== currentVersion && data.version !== notifiedVersion) {
        notifiedVersion = data.version;
        onUpdate(data.version);
      }
    } catch {
      // 静态版本文件暂不可用时，保留当前页面继续使用。
    } finally {
      window.clearTimeout(timeout);
      checking = false;
    }
  };

  void check();
  window.setInterval(() => { void check(); }, CHECK_INTERVAL);
  window.addEventListener('focus', () => { void check(); });
  document.addEventListener('visibilitychange', () => { void check(); });
};
