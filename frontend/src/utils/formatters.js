// frontend/src/utils/formatters.js
// Utility Functions für Formatierung, Berechnung und Helper-Funktionen

// === DATE & TIME FORMATTERS ===

export const formatDate = (dateStr, options = {}) => {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '-';
    
    const defaultOptions = {
      locale: 'de-DE',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    
    return date.toLocaleDateString(options.locale || defaultOptions.locale, {
      ...defaultOptions,
      ...options
    });
  } catch (err) {
    console.warn('Date formatting error:', err);
    return '-';
  }
};

export const formatDateTime = (dateTimeStr, options = {}) => {
  if (!dateTimeStr) return '-';
  
  try {
    const date = new Date(dateTimeStr);
    
    if (isNaN(date.getTime())) return '-';
    
    const dateStr = formatDate(dateTimeStr, options);
    const timeStr = date.toLocaleTimeString(options.locale || 'de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      ...options.timeOptions
    });
    
    return `${dateStr} ${timeStr}`;
  } catch (err) {
    console.warn('DateTime formatting error:', err);
    return '-';
  }
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  
  try {
    // Handle different time formats
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    
    return timeStr;
  } catch (err) {
    console.warn('Time formatting error:', err);
    return timeStr;
  }
};

// Relative time formatting
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '-';
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 7) {
      return formatDate(dateStr);
    } else if (diffDays > 0) {
      return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    } else if (diffHours > 0) {
      return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
    } else if (diffMinutes > 0) {
      return `vor ${diffMinutes} Minute${diffMinutes > 1 ? 'n' : ''}`;
    } else {
      return 'gerade eben';
    }
  } catch (err) {
    console.warn('Relative time formatting error:', err);
    return formatDate(dateStr);
  }
};

// === CURRENCY & NUMBER FORMATTERS ===

export const formatCurrency = (amount, currency = 'EUR', options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  
  try {
    const defaultOptions = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    };
    
    return new Intl.NumberFormat('de-DE', {
      ...defaultOptions,
      ...options
    }).format(parseFloat(amount));
  } catch (err) {
    console.warn('Currency formatting error:', err);
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  }
};

export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) return '-';
  
  try {
    const defaultOptions = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    };
    
    return new Intl.NumberFormat('de-DE', {
      ...defaultOptions,
      ...options
    }).format(parseFloat(number));
  } catch (err) {
    console.warn('Number formatting error:', err);
    return parseFloat(number).toString();
  }
};

export const formatWeight = (weight, unit = 'kg') => {
  if (!weight || isNaN(weight)) return '-';
  
  const num = parseFloat(weight);
  if (num === 0) return '0 kg';
  
  return `${formatNumber(num)} ${unit}`;
};

export const formatVolume = (volume, unit = 'm³') => {
  if (!volume || isNaN(volume)) return '-';
  
  const num = parseFloat(volume);
  if (num === 0) return '0 m³';
  
  return `${formatNumber(num, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${unit}`;
};

export const formatPercentage = (value, options = {}) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  
  try {
    const defaultOptions = {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    };
    
    // Convert to decimal if needed (e.g., 25 -> 0.25)
    const decimal = parseFloat(value) > 1 ? parseFloat(value) / 100 : parseFloat(value);
    
    return new Intl.NumberFormat('de-DE', {
      ...defaultOptions,
      ...options
    }).format(decimal);
  } catch (err) {
    console.warn('Percentage formatting error:', err);
    return `${parseFloat(value).toFixed(1)}%`;
  }
};

// === COLOR & STATUS HELPERS ===

export const getTrafficLightColor = (status) => {
  const colors = {
    'green': '#34c759',
    'yellow': '#ff9500',
    'red': '#ff3b30',
    'grey': '#c7c7cc',
    'gray': '#c7c7cc'
  };
  return colors[status?.toLowerCase()] || colors.grey;
};

export const getTransportColor = (type) => {
  const colors = {
    'air': { bg: '#e3f2ff', color: '#0071e3', icon: '✈️' },
    'AIR': { bg: '#e3f2ff', color: '#0071e3', icon: '✈️' },
    'luftfracht': { bg: '#e3f2ff', color: '#0071e3', icon: '✈️' },
    
    'truck': { bg: '#f0f9e8', color: '#34c759', icon: '🚚' },
    'LKW': { bg: '#f0f9e8', color: '#34c759', icon: '🚚' },
    'TRUCK': { bg: '#f0f9e8', color: '#34c759', icon: '🚚' },
    'road': { bg: '#f0f9e8', color: '#34c759', icon: '🚚' },
    
    'sea': { bg: '#e8f3ff', color: '#007aff', icon: '🚢' },
    'SEE': { bg: '#e8f3ff', color: '#007aff', icon: '🚢' },
    'SEA': { bg: '#e8f3ff', color: '#007aff', icon: '🚢' },
    'ocean': { bg: '#e8f3ff', color: '#007aff', icon: '🚢' },
    'seefracht': { bg: '#e8f3ff', color: '#007aff', icon: '🚢' },
    
    'rail': { bg: '#fff3e8', color: '#ff6600', icon: '🚆' },
    'bahn': { bg: '#fff3e8', color: '#ff6600', icon: '🚆' }
  };
  
  return colors[type] || colors.air;
};

export const getStatusColor = (status) => {
  const colors = {
    // Anfragen & Angebote
    'ANFRAGE': { bg: '#fef3c7', color: '#92400e', icon: '❓' },
    'ANGEBOT': { bg: '#dbeafe', color: '#1e40af', icon: '💼' },
    'ABGELEHNT': { bg: '#fee2e2', color: '#dc2626', icon: '❌' },
    
    // Sendung Status
    'created': { bg: '#f3f4f6', color: '#374151', icon: '📋' },
    'neu': { bg: '#f3f4f6', color: '#374151', icon: '🆕' },
    'booked': { bg: '#ddd6fe', color: '#5b21b6', icon: '📅' },
    'assigned': { bg: '#e0e7ff', color: '#3730a3', icon: '👥' },
    'abgeholt': { bg: '#fed7aa', color: '#ea580c', icon: '📦' },
    'picked_up': { bg: '#fed7aa', color: '#ea580c', icon: '📦' },
    'in_transit': { bg: '#bfdbfe', color: '#1d4ed8', icon: '🚛' },
    'zustellung': { bg: '#fde68a', color: '#d97706', icon: '🚚' },
    'zugestellt': { bg: '#d1fae5', color: '#065f46', icon: '✅' },
    'delivered': { bg: '#d1fae5', color: '#065f46', icon: '✅' },
    'delayed': { bg: '#fee2e2', color: '#dc2626', icon: '⚠️' },
    'storniert': { bg: '#f3f4f6', color: '#6b7280', icon: '🚫' },
    'cancelled': { bg: '#f3f4f6', color: '#6b7280', icon: '🚫' }
  };
  
  return colors[status] || { bg: '#f3f4f6', color: '#6b7280', icon: '❔' };
};

export const getPriorityColor = (priority) => {
  const colors = {
    'low': { bg: '#f0fdf4', color: '#166534', icon: '🔽' },
    'normal': { bg: '#f8fafc', color: '#475569', icon: '➖' },
    'high': { bg: '#fef2f2', color: '#dc2626', icon: '🔺' },
    'urgent': { bg: '#fdf2f8', color: '#be185d', icon: '🚨' }
  };
  
  return colors[priority] || colors.normal;
};

// === CALCULATION HELPERS ===

export const calculateTransitDays = (sendung) => {
  if (!sendung.pickup_date || !sendung.delivery_date) return '-';
  
  try {
    const pickup = new Date(sendung.pickup_date);
    const delivery = new Date(sendung.delivery_date);
    
    if (isNaN(pickup.getTime()) || isNaN(delivery.getTime())) return '-';
    
    const diffTime = delivery - pickup;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : '-';
  } catch (err) {
    console.warn('Transit days calculation error:', err);
    return '-';
  }
};

export const calculateProfit = (sellingPrice, costs) => {
  if (!sellingPrice || isNaN(sellingPrice)) return 0;
  
  const totalCosts = (costs.pickup || 0) + (costs.main || 0) + (costs.delivery || 0);
  return parseFloat(sellingPrice) - totalCosts;
};

export const calculateMargin = (sellingPrice, costs) => {
  if (!sellingPrice || isNaN(sellingPrice) || parseFloat(sellingPrice) === 0) return 0;
  
  const profit = calculateProfit(sellingPrice, costs);
  return (profit / parseFloat(sellingPrice)) * 100;
};

export const calculatePricePerKg = (price, weight) => {
  if (!price || !weight || isNaN(price) || isNaN(weight) || parseFloat(weight) === 0) return 0;
  
  return parseFloat(price) / parseFloat(weight);
};

// === ADDRESS & LOCATION HELPERS ===

export const formatAddress = (address, options = {}) => {
  if (!address) return '-';
  
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.zip && address.city) {
    parts.push(`${address.zip} ${address.city}`);
  } else {
    if (address.zip) parts.push(address.zip);
    if (address.city) parts.push(address.city);
  }
  if (address.country && options.includeCountry) parts.push(address.country);
  
  return parts.join(', ') || '-';
};

export const formatRoute = (from, to, options = {}) => {
  if (!from || !to) return '-';
  
  const separator = options.separator || ' → ';
  const showAirports = options.showAirports !== false;
  
  let fromStr = from;
  let toStr = to;
  
  if (showAirports && from.includes('(') && from.includes(')')) {
    fromStr = from;
  } else if (showAirports && options.fromAirport) {
    fromStr = `${from} (${options.fromAirport})`;
  }
  
  if (showAirports && to.includes('(') && to.includes(')')) {
    toStr = to;
  } else if (showAirports && options.toAirport) {
    toStr = `${to} (${options.toAirport})`;
  }
  
  return `${fromStr}${separator}${toStr}`;
};

// === VALIDATION HELPERS ===

export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone) => {
  if (!phone) return false;
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const isValidAWB = (awb) => {
  if (!awb) return false;
  // AWB format: XXX-XXXXXXXX or XXXXXXXXXXX
  const awbRegex = /^(\d{3}-\d{8}|\d{11})$/;
  return awbRegex.test(awb.replace(/\s/g, ''));
};

export const isValidWeight = (weight) => {
  if (!weight) return false;
  const num = parseFloat(weight);
  return !isNaN(num) && num > 0 && num < 100000; // Max 100 tons
};

export const isValidPieces = (pieces) => {
  if (!pieces) return false;
  const num = parseInt(pieces);
  return !isNaN(num) && num > 0 && num < 10000; // Max 10k pieces
};

// === TEXT HELPERS ===

export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const capitalizeFirst = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '-';
  
  try {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // German mobile format
    if (cleaned.startsWith('49') && cleaned.length === 12) {
      return `+49 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 9)} ${cleaned.substring(9)}`;
    }
    
    // German landline format
    if (cleaned.startsWith('49') && cleaned.length === 11) {
      return `+49 ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
    }
    
    // Default international format
    if (cleaned.length > 10) {
      return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
    }
    
    return phone; // Return original if can't format
  } catch (err) {
    console.warn('Phone formatting error:', err);
    return phone;
  }
};

// === SORTING HELPERS ===

export const sortByDate = (a, b, field, ascending = true) => {
  const dateA = new Date(a[field] || 0);
  const dateB = new Date(b[field] || 0);
  
  if (ascending) {
    return dateA - dateB;
  } else {
    return dateB - dateA;
  }
};

export const sortByString = (a, b, field, ascending = true) => {
  const strA = (a[field] || '').toString().toLowerCase();
  const strB = (b[field] || '').toString().toLowerCase();
  
  if (ascending) {
    return strA.localeCompare(strB, 'de-DE');
  } else {
    return strB.localeCompare(strA, 'de-DE');
  }
};

export const sortByNumber = (a, b, field, ascending = true) => {
  const numA = parseFloat(a[field]) || 0;
  const numB = parseFloat(b[field]) || 0;
  
  if (ascending) {
    return numA - numB;
  } else {
    return numB - numA;
  }
};

// === EXPORT DEFAULT COLLECTION ===

export default {
  // Date & Time
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  
  // Currency & Numbers
  formatCurrency,
  formatNumber,
  formatWeight,
  formatVolume,
  formatPercentage,
  
  // Colors & Status
  getTrafficLightColor,
  getTransportColor,
  getStatusColor,
  getPriorityColor,
  
  // Calculations
  calculateTransitDays,
  calculateProfit,
  calculateMargin,
  calculatePricePerKg,
  
  // Address & Location
  formatAddress,
  formatRoute,
  
  // Validation
  isValidEmail,
  isValidPhone,
  isValidAWB,
  isValidWeight,
  isValidPieces,
  
  // Text
  truncateText,
  capitalizeFirst,
  formatPhoneNumber,
  
  // Sorting
  sortByDate,
  sortByString,
  sortByNumber
};