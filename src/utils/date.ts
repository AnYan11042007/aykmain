/**
 * Utility functions for Vietnam Time Zone (Asia/Ho_Chi_Minh - ICT UTC+7)
 */

export function getTodayVNString(): string {
  // Returns YYYY-MM-DD according to Vietnam local time (Asia/Ho_Chi_Minh)
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function getYesterdayVNString(): string {
  const vnTodayStr = getTodayVNString();
  const [year, month, day] = vnTodayStr.split('-').map(Number);
  const vnDate = new Date(Date.UTC(year, month - 1, day));
  vnDate.setUTCDate(vnDate.getUTCDate() - 1);
  const yYear = vnDate.getUTCFullYear();
  const yMonth = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const yDay = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${yYear}-${yMonth}-${yDay}`;
}

export function getVNTimeString(date: Date = new Date()): string {
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
