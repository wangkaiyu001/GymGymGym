function parseLocalDate(value) {
  if (!value) return null;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  const date = parseLocalDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from, to) {
  const start = startOfDay(from);
  const end = startOfDay(to);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

function buildBodyPartReminders(sessions, now) {
  const latestByPart = {};
  (sessions || []).forEach((session) => {
    const performedAt = parseLocalDate(session.date || session.ended_at || session.updated_at || session.created_at);
    const bodyParts = session.intent && Array.isArray(session.intent.focus_body_parts)
      ? session.intent.focus_body_parts
      : [];
    if (!performedAt) return;
    bodyParts.forEach((part) => {
      const current = latestByPart[part];
      if (!current || performedAt > current) latestByPart[part] = performedAt;
    });
  });

  return Object.keys(latestByPart)
    .map((part) => {
      const days = daysBetween(latestByPart[part], now || new Date());
      let state = 'ready';
      let hint = `已间隔 ${days} 天`;
      if (days === 0) {
        state = 'today';
        hint = '今天刚练过';
      } else if (days === 1) {
        state = 'recent';
        hint = '昨天刚练过';
      } else if (days <= 2) {
        state = 'recent';
        hint = `仅间隔 ${days} 天`;
      }
      return {
        part,
        days,
        state,
        hint,
      };
    })
    .sort((a, b) => b.days - a.days || a.part.localeCompare(b.part, 'zh-CN'));
}

module.exports = {
  buildBodyPartReminders,
  daysBetween,
};
