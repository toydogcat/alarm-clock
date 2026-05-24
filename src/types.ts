export interface Alarm {
  id: string;
  time: string; // "HH:MM" format
  label: string; // e.g. "吃藥時間", "開會提醒"
  repeatType: 'once' | 'daily' | 'weekly';
  repeatDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  soundType: 'buzzer' | 'ringtone' | 'chime' | 'silent';
  volume: number; // 0.0 to 1.0
  simulateCall: boolean; // 是否模擬來電畫面
  vibrate: boolean; // 是否啟用裝置震動
  showNotification: boolean; // 是否顯示提示訊息與通知
  enabled: boolean; // 是否啟用
  snoozeCount: number;
  lastTriggeredDate: string | null; // "YYYY-MM-DD" style to prevent double ring
}

export interface SoundPreset {
  id: string;
  name: string;
  freq: number;
  type: string;
}
