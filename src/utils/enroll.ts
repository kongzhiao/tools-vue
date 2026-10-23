import dayjs from 'dayjs';

/** 参保业务年度固定从2025年开始，允许提前办理下一年度。 */
export const getEnrollYearOptions = (currentYear = dayjs().year()) => {
  const firstYear = 2025;
  const lastYear = currentYear + 1;
  return Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => {
    const year = firstYear + index;
    return { label: `${year}`, value: year };
  });
};
