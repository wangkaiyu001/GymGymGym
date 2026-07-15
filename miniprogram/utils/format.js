function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date) {
  const current = date ? new Date(date) : new Date();
  return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
}

function formatDateTime(date) {
  const current = date ? new Date(date) : new Date();
  return `${formatDate(current)} ${pad(current.getHours())}:${pad(current.getMinutes())}`;
}

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function goalLabel(value, options) {
  const item = options.find((option) => option.value === value);
  return item ? item.label : value;
}

module.exports = {
  formatDate,
  formatDateTime,
  toNumber,
  goalLabel,
};
