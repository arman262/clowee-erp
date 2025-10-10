// Bangladesh timezone (GMT+6)
const BANGLADESH_TIMEZONE = 'Asia/Dhaka';

export const formatDate = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Convert to Bangladesh timezone
  const bangladeshDate = new Date(d.toLocaleString('en-US', { timeZone: BANGLADESH_TIMEZONE }));
  return `${bangladeshDate.getDate()} ${months[bangladeshDate.getMonth()]} ${bangladeshDate.getFullYear()}`;
};

export const formatDateTime = (date: string | Date) => {
  if (!date) return '';
  const d = new Date(date);
  
  // Convert to Bangladesh timezone
  return d.toLocaleString('en-US', { 
    timeZone: BANGLADESH_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const toBangladeshDate = (date: string | Date) => {
  if (!date) return null;
  const d = new Date(date);
  
  // Convert to Bangladesh timezone and return as ISO string
  const bangladeshTime = new Date(d.toLocaleString('en-US', { timeZone: BANGLADESH_TIMEZONE }));
  return bangladeshTime.toISOString().split('T')[0];
};

export const getCurrentBangladeshDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: BANGLADESH_TIMEZONE }); // Returns YYYY-MM-DD format
};

export const getCurrentBangladeshDateTime = () => {
  const now = new Date();
  return now.toLocaleString('sv-SE', { timeZone: BANGLADESH_TIMEZONE }); // Returns YYYY-MM-DD HH:mm:ss format
};