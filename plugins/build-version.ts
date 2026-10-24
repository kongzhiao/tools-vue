import { writeFileSync } from 'fs';
import { join } from 'path';
import type { IApi } from 'umi';

export const createBuildVersion = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return ['year', 'month', 'day', 'hour', 'minute', 'second']
    .map(type => parts.find(part => part.type === type)?.value || '')
    .join('');
};

export default (api: IApi) => {
  const builtAt = new Date();
  const version = api.env === 'production' ? createBuildVersion(builtAt) : '';

  api.addHTMLMetas(() => version ? [{ name: 'app-build-version', content: version }] : []);
  api.onBuildComplete(({ err }) => {
    if (err || !version) return;
    writeFileSync(
      join(api.paths.absOutputPath, 'version.json'),
      JSON.stringify({ version, builtAt: builtAt.toISOString() }, null, 2) + '\n',
    );
  });
};
