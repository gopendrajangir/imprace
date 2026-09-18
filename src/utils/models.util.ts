export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
};
