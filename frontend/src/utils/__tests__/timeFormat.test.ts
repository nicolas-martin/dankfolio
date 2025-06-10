import { formatTimeAgo } from '../timeFormat';

describe('formatTimeAgo', () => {
  const now = new Date();

  it('should return "just now" for times less than 10 seconds ago', () => {
    const date = new Date(now.getTime() - 5 * 1000); // 5 seconds ago
    expect(formatTimeAgo(date)).toBe('just now');
  });

  it('should return "X seconds ago" for times between 10-59 seconds ago', () => {
    const date30 = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
    expect(formatTimeAgo(date30)).toBe('30 seconds ago');
    
    const date15 = new Date(now.getTime() - 15 * 1000); // 15 seconds ago
    expect(formatTimeAgo(date15)).toBe('15 seconds ago');
  });

  it('should handle singular second correctly', () => {
    const date = new Date(now.getTime() - 11 * 1000); // 11 seconds ago (rounded to 11)
    expect(formatTimeAgo(date)).toBe('11 seconds ago');
  });

  it('should return "1 minute ago" for 1 minute ago', () => {
    const date = new Date(now.getTime() - 60 * 1000); // 1 minute ago
    expect(formatTimeAgo(date)).toBe('1 minute ago');
  });

  it('should return "X minutes ago" for times less than an hour ago', () => {
    const date = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    expect(formatTimeAgo(date)).toBe('30 minutes ago');
  });

  it('should return "1 hour ago" for 1 hour ago', () => {
    const date = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    expect(formatTimeAgo(date)).toBe('1 hour ago');
  });

  it('should return "X hours ago" for times less than a day ago', () => {
    const date = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
    expect(formatTimeAgo(date)).toBe('12 hours ago');
  });

  it('should return "1 day ago" for 1 day ago', () => {
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    expect(formatTimeAgo(date)).toBe('1 day ago');
  });

  it('should return "X days ago" for times more than a day ago', () => {
    const date = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    expect(formatTimeAgo(date)).toBe('3 days ago');
  });

  it('should return an empty string for an undefined date', () => {
    expect(formatTimeAgo(undefined)).toBe('');
  });

  it('should handle pluralization correctly for minutes', () => {
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    expect(formatTimeAgo(oneMinuteAgo)).toBe('1 minute ago');
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    expect(formatTimeAgo(twoMinutesAgo)).toBe('2 minutes ago');
  });

  it('should handle pluralization correctly for hours', () => {
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    expect(formatTimeAgo(oneHourAgo)).toBe('1 hour ago');
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoHoursAgo)).toBe('2 hours ago');
  });

  it('should handle pluralization correctly for days', () => {
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(oneDayAgo)).toBe('1 day ago');
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoDaysAgo)).toBe('2 days ago');
  });
});
