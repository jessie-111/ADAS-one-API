// 通用時間軸工具：連續時間序列、RWD ticks、格式化

// 候選漂亮步長（毫秒）
const CANDIDATE_STEPS = [
  1 * 60 * 1000,   // 1m
  5 * 60 * 1000,   // 5m
  15 * 60 * 1000,  // 15m
  30 * 60 * 1000,  // 30m
  60 * 60 * 1000,  // 1h
  2 * 60 * 60 * 1000, // 2h
  3 * 60 * 60 * 1000, // 3h
  6 * 60 * 60 * 1000, // 6h
  12 * 60 * 60 * 1000, // 12h
  24 * 60 * 60 * 1000, // 1d
  2 * 24 * 60 * 60 * 1000, // 2d
  7 * 24 * 60 * 60 * 1000  // 1w
];

export function chooseFormatBySpan(spanMs, stepMs) {
  const oneDay = 24 * 60 * 60 * 1000;
  if (spanMs < oneDay) return 'HH:mm';
  if (spanMs < 7 * oneDay) {
    // 日級間隔顯示月-日，若 step < 1d 可加時間
    return stepMs < oneDay ? 'MM-dd HH:mm' : 'MM-dd';
  }
  // 週或以上
  return 'yyyy-MM-dd';
}

export function estimateLabelWidthPx(format) {
  // 粗估字寬，避免重疊。可依實際字型微調。
  if (format === 'HH:mm') return 46;
  if (format === 'MM-dd') return 54;
  if (format === 'MM-dd HH:mm') return 80;
  return 72; // yyyy-MM-dd
}

export function pickNiceStep(spanMs, maxTicks) {
  const ideal = spanMs / Math.max(1, maxTicks);
  for (let i = 0; i < CANDIDATE_STEPS.length; i += 1) {
    if (CANDIDATE_STEPS[i] >= ideal) return CANDIDATE_STEPS[i];
  }
  return CANDIDATE_STEPS[CANDIDATE_STEPS.length - 1];
}

export function alignToStepFloor(ms, stepMs) {
  return Math.floor(ms / stepMs) * stepMs;
}

export function buildTicks(startMs, endMs, containerWidth) {
  const spanMs = Math.max(1, endMs - startMs);
  // 估算最大刻度數
  const roughFormat = chooseFormatBySpan(spanMs, spanMs);
  const labelWidth = estimateLabelWidthPx(roughFormat);
  const baseWidth = containerWidth && containerWidth > 0 ? containerWidth : 600;
  let maxTicks = Math.max(3, Math.floor(baseWidth / Math.max(36, labelWidth)));
  if (maxTicks > 12) maxTicks = 12; // 上限，避免過密

  const stepMs = pickNiceStep(spanMs, maxTicks - 1);
  const format = chooseFormatBySpan(spanMs, stepMs);

  const ticks = [];
  // 一定包含起點
  ticks.push(startMs);

  // 對齊到下一個 step 邊界後開始產生中間刻度
  let t = alignToStepFloor(startMs, stepMs);
  if (t < startMs) t += stepMs;
  for (; t <= endMs; t += stepMs) {
    if (t > startMs && t < endMs) ticks.push(t);
  }
  // 一定包含終點
  ticks.push(endMs);

  // 依最大刻度數降密（保留首尾）
  if (ticks.length > maxTicks) {
    const inner = ticks.slice(1, -1);
    const stride = Math.ceil(inner.length / (maxTicks - 2));
    const down = inner.filter((_, i) => i % stride === 0);
    const finalTicks = [ticks[0], ...down, ticks[ticks.length - 1]];
    return { ticks: finalTicks, stepMs, format };
  }

  return { ticks, stepMs, format };
}

export function formatTickWithPattern(value, pattern) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  switch (pattern) {
    case 'HH:mm':
      return `${HH}:${mm}`;
    case 'MM-dd':
      return `${MM}-${dd}`;
    case 'MM-dd HH:mm':
      return `${MM}-${dd} ${HH}:${mm}`;
    default:
      return `${yyyy}-${MM}-${dd}`;
  }
}

// 根據資料點數建立時間序列 timestamp（不硬編碼時間點，依起訖與點數線性分布）
export function buildSeriesWithTimestamps(dataArray, startMs, endMs) {
  const data = Array.isArray(dataArray) ? dataArray : [];
  if (data.length === 0) return [];
  if (data[0] && typeof data[0].timestamp === 'number') return data; // 已有 timestamp
  const n = data.length;
  const step = n > 1 ? (endMs - startMs) / (n - 1) : (endMs - startMs) || 15 * 60 * 1000;
  return data.map((item, i) => ({ ...item, timestamp: Math.round(startMs + i * step) }));
}

