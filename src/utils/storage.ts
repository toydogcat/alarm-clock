import { Alarm } from '../types';

const COOKIE_NAME = 'alarms_pwa_data';
const LOCAL_STORAGE_KEY = 'alarms_pwa_backup';

function setCookie(value: Alarm[]) {
  try {
    const jsonStr = JSON.stringify(value);
    const expires = new Date();
    // Cache for 365 days
    expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(jsonStr)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  } catch (err) {
    console.error('Failed to set alarms cookie', err);
  }
}

function getCookie(): Alarm[] | null {
  try {
    const nameEQ = COOKIE_NAME + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const value = decodeURIComponent(c.substring(nameEQ.length, c.length));
        return JSON.parse(value);
      }
    }
  } catch (err) {
    console.error('Failed to parse cookie data', err);
  }
  return null;
}

// Get system initialized default alarms when empty
export const DEFAULT_ALARMS: Alarm[] = [
  {
    id: 'default-1',
    time: '08:00',
    label: '💊 早晨吃藥與溫和喚醒',
    repeatType: 'daily',
    repeatDays: [1, 2, 3, 4, 5], // Mon to Fri
    soundType: 'chime',
    volume: 0.8,
    simulateCall: false,
    vibrate: true,
    showNotification: true,
    enabled: true,
    isStrong: false,
    snoozeCount: 0,
    lastTriggeredDate: null
  },
  {
    id: 'default-2',
    time: '12:30',
    label: '💼 午間開會來電模擬',
    repeatType: 'weekly',
    repeatDays: [1, 3, 5], // Mon, Wed, Fri
    soundType: 'ringtone',
    volume: 0.9,
    simulateCall: true,
    vibrate: true,
    showNotification: true,
    enabled: false,
    isStrong: false,
    snoozeCount: 0,
    lastTriggeredDate: null
  },
  {
    id: 'default-3',
    time: '22:00',
    label: '💧 睡前喝水與準備就寢',
    repeatType: 'once',
    repeatDays: [],
    soundType: 'buzzer',
    volume: 0.7,
    simulateCall: false,
    vibrate: false,
    showNotification: true,
    enabled: false,
    isStrong: false,
    snoozeCount: 0,
    lastTriggeredDate: null
  }
];

export function getAlarms(): Alarm[] {
  // 1. Try reading cookie as requested
  const cookieData = getCookie();
  if (cookieData && Array.isArray(cookieData) && cookieData.length > 0) {
    return cookieData;
  }

  // 2. Fallback to LocalStorage
  try {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      const parsed = JSON.parse(localData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sync back to cookie
        setCookie(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.error('LocalStorage load failed', e);
  }

  // 3. Return defaults and store them
  setCookie(DEFAULT_ALARMS);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_ALARMS));
  } catch (e) {}
  return DEFAULT_ALARMS;
}

export function saveAlarms(alarms: Alarm[]) {
  // Sync both Cookie and LocalStorage
  setCookie(alarms);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alarms));
  } catch (e) {
    console.error('Sync to LocalStorage failed', e);
  }
}

export function clearAlarmsToDefault() {
  saveAlarms(DEFAULT_ALARMS);
  return DEFAULT_ALARMS;
}

export function exportConfig(alarms: Alarm[]): string {
  return JSON.stringify(alarms, null, 2);
}

export function importConfig(jsonString: string): Alarm[] {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    throw new Error('匯入的資料格式不正確：必須為陣列');
  }
  
  // Validate basic shape
  const validated = parsed.map((item: any, idx: number) => {
    if (!item.id || typeof item.time !== 'string') {
      throw new Error(`第 ${idx + 1} 個項目缺少必要的 id 或 time 欄位`);
    }
    return {
      id: item.id || `imported-${Date.now()}-${idx}`,
      time: item.time,
      label: item.label || '無標籤',
      repeatType: item.repeatType || 'once',
      repeatDays: Array.isArray(item.repeatDays) ? item.repeatDays : [],
      soundType: item.soundType || 'chime',
      volume: typeof item.volume === 'number' ? item.volume : 0.8,
      simulateCall: !!item.simulateCall,
      vibrate: !!item.vibrate,
      showNotification: item.showNotification !== undefined ? !!item.showNotification : true,
      enabled: item.enabled !== undefined ? !!item.enabled : true,
      isStrong: !!item.isStrong,
      snoozeCount: 0,
      lastTriggeredDate: null
    } as Alarm;
  });

  saveAlarms(validated);
  return validated;
}
