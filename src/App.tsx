import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { 
  Bell, Plus, Trash2, Volume2, Save, Undo, Download, Upload, 
  Settings, HelpCircle, Check, AlertCircle, Sparkles, X, 
  AlertTriangle, Eye, EyeOff, Radio, Play, Square, RefreshCcw,
  Timer, Zap, Hourglass, Flag
} from 'lucide-react';

import { Alarm } from './types';
import { startSound, stopSound, testSound } from './utils/audio';
import { 
  getAlarms, saveAlarms, clearAlarmsToDefault, 
  exportConfig, importConfig 
} from './utils/storage';

import ClockDashboard from './components/ClockDashboard';
import CallSimulator from './components/CallSimulator';
import AlarmRingingScreen from './components/AlarmRingingScreen';

export default function App() {
  // State variables
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  
  // Countdown Timer state
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [timerInputHours, setTimerInputHours] = useState(8);
  const [timerInputMinutes, setTimerInputMinutes] = useState(5);
  const [countdownStartTime, setCountdownStartTime] = useState<string | null>(null);

  // Stopwatch state
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [stopwatchLaps, setStopwatchLaps] = useState<number[]>([]);

  // Custom Snooze state
  const [snoozedAlarms, setSnoozedAlarms] = useState<{ alarmId: string; triggerAt: number }[]>([]);

  // Form State for creating a new Alarm
  const [isAdding, setIsAdding] = useState(false);
  const [timeInput, setTimeInput] = useState('08:00');
  const [labelInput, setLabelInput] = useState('');
  const [repeatTypeInput, setRepeatTypeInput] = useState<'once' | 'daily' | 'weekly'>('once');
  const [repeatDaysInput, setRepeatDaysInput] = useState<number[]>([]); // Array of 0..6
  const [soundTypeInput, setSoundTypeInput] = useState<'buzzer' | 'ringtone' | 'chime' | 'silent'>('chime');
  const [volumeInput, setVolumeInput] = useState(0.8);
  const [simulateCallInput, setSimulateCallInput] = useState(false);
  const [vibrateInput, setVibrateInput] = useState(true);
  const [isStrongInput, setIsStrongInput] = useState(false);
  const [showNotificationInput, setShowNotificationInput] = useState(true);

  // Editing state mapping
  const [editingAlarmId, setEditingAlarmId] = useState<string | null>(null);

  // Sound test states
  const [testPlayingType, setTestPlayingType] = useState<string | null>(null);

  // Native notification permission state
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  // File Upload states
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vibration loop reference
  const vibrationIntervalRef = useRef<any>(null);

  // --- Luna AI Hub: Iframe Scroll Sync Protocol ---
  useEffect(() => {
    let lastScrollY = 0;
    const scrollThreshold = 8;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold && currentScrollY > 10) return;
      
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      
      window.parent.postMessage({
        type: 'iframe_scroll',
        scrollY: currentScrollY,
        direction: direction
      }, '*');
      
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Luna AI Hub: Vercount Refresh (for SPA logic) ---
  useEffect(() => {
    const triggerVercount = () => {
      if ((window as any).vercount && typeof (window as any).vercount.fetch === 'function') {
        (window as any).vercount.fetch();
      }
    };

    // Initial delay to ensure DOM is ready
    const timer = setTimeout(triggerVercount, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Refresh on major UI changes
  useEffect(() => {
    if ((window as any).vercount && typeof (window as any).vercount.fetch === 'function') {
      (window as any).vercount.fetch();
    }
  }, [activeAlarm, isAdding]); 

  // --- Countdown Timer Logic ---
  useEffect(() => {
    let interval: any;
    if (isCountdownRunning && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => prev - 1);
      }, 1000);
    } else if (countdownSeconds === 0 && isCountdownRunning) {
      setIsCountdownRunning(false);
      // Trigger Timer Alarm
      const timerAlarm: Alarm = {
        id: 'timer-' + Date.now(),
        time: '倒數結束',
        label: '⏱️ 倒數計時時間到！',
        repeatType: 'once',
        repeatDays: [],
        soundType: 'buzzer',
        volume: 0.9,
        simulateCall: false,
        vibrate: true,
        showNotification: true,
        enabled: true,
        isStrong: false,
        snoozeCount: 0,
        lastTriggeredDate: null
      };
      setActiveAlarm(timerAlarm);
      triggerAlarmEffects(timerAlarm);
    }
    return () => clearInterval(interval);
  }, [isCountdownRunning, countdownSeconds]);

  // --- Stopwatch Logic ---
  useEffect(() => {
    let interval: any;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // Load alarms initial
  useEffect(() => {
    setAlarms(getAlarms());
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request native browser permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const resp = await Notification.requestPermission();
      setNotificationPermission(resp);
    } else {
      alert('您的瀏覽器不支援 Web Notification。');
    }
  };

  // Sound and vibration loop triggering helper
  const triggerAlarmEffects = (alarm: Alarm) => {
    // 1. Play synthesized continuous tone / melody
    const volume = alarm.isStrong ? Math.min(alarm.volume * 1.5, 1.0) : alarm.volume;
    startSound(alarm.soundType, volume);

    // 2. Trigger navigator vibration API if toggled and supported
    if (alarm.vibrate) {
      if ('vibrate' in navigator) {
        const pattern = alarm.isStrong 
          ? [500, 100, 500, 100, 500, 100, 800] 
          : [300, 100, 300, 100, 300];
        navigator.vibrate(pattern);
        // vibrate repeatedly
        vibrationIntervalRef.current = setInterval(() => {
          navigator.vibrate(pattern);
        }, alarm.isStrong ? 1000 : 1500);
      }
    }

    // 3. Trigger native local system notifications if configured and valid
    if (alarm.showNotification && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`小鬧鐘提醒：${alarm.label || '鬧鐘時間到了！'}`, {
          body: `時間已到 ${alarm.time}。點選返回應用。`,
          icon: './favicon.svg',
          tag: 'alarm-' + alarm.id,
          requireInteraction: true
        });
      } catch (err) {
        // Fallback using service worker if active standard Notification constructor is sandboxed inside nested frame
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TRIGGER_NOTIFICATION',
            title: `小鬧鐘提醒：${alarm.label || '鬧鐘時間到了！'}`,
            body: `時間已到 ${alarm.time}。`
          });
        }
      }
    }
  };

  // Stop dynamic effects safely on user response
  const killAlarmEffects = () => {
    stopSound();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0); // clear any active vibrate buzzes
    }
  };

  // Main system ticker - runs every second
  useEffect(() => {
    const clockTicker = setInterval(() => {
      // If there is already an active alarm currently ringing, stall ticker inspections
      if (activeAlarm) return;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const currentDate = String(now.getDate()).padStart(2, '0');
      const todayDateString = `${currentYear}-${currentMonth}-${currentDate}`;

      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentFormattedTime = `${currentHours}:${currentMinutes}`;
      const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // 1. Check for standard configured Alarms matching time requirements
      const matchingAlarm = alarms.find((alarm) => {
        if (!alarm.enabled) return false;
        if (alarm.time !== currentFormattedTime) return false;

        // Prevent immediate re-trigger during the exact same minute
        if (alarm.lastTriggeredDate === todayDateString) return false;

        // Check Repetition rules
        if (alarm.repeatType === 'once') {
          return true;
        } else if (alarm.repeatType === 'daily') {
          return true;
        } else if (alarm.repeatType === 'weekly') {
          return alarm.repeatDays.includes(currentDayOfWeek);
        }
        return false;
      });

      if (matchingAlarm) {
        // Mark as triggered for today to avoid multiple firing inside the 60 seconds
        const updatedAlarms = alarms.map((a) => {
          if (a.id === matchingAlarm.id) {
            // If repeat type is once, toggle off enabled status immediately on trigger
            const shouldDisable = a.repeatType === 'once';
            return { 
              ...a, 
              lastTriggeredDate: todayDateString,
              enabled: shouldDisable ? false : a.enabled
            };
          }
          return a;
        });

        setAlarms(updatedAlarms);
        saveAlarms(updatedAlarms);

        // Ring Alarm!
        setActiveAlarm(matchingAlarm);
        triggerAlarmEffects(matchingAlarm);
        return; // Break to let ringing handle
      }

      // 2. Check for active Snoozed alarms
      const nowEpoch = Date.now();
      const snoozedTrigger = snoozedAlarms.find((s) => nowEpoch >= s.triggerAt);
      if (snoozedTrigger) {
        setSnoozedAlarms((prev) => prev.filter((s) => s.alarmId !== snoozedTrigger.alarmId));
        
        const originalAlarm = alarms.find((a) => a.id === snoozedTrigger.alarmId);
        if (originalAlarm) {
          const reRingAlarm = { 
            ...originalAlarm, 
            snoozeCount: (originalAlarm.snoozeCount || 0) + 1 
          };
          
          setActiveAlarm(reRingRing => reRingAlarm);
          triggerAlarmEffects(reRingAlarm);
        }
      }

    }, 1000);

    return () => clearInterval(clockTicker);
  }, [alarms, activeAlarm, snoozedAlarms]);

  // Handle Snooze command (Snooze 5 minutes)
  const handleSnooze = () => {
    if (!activeAlarm) return;
    killAlarmEffects();

    const snoozeDurationMs = 5 * 60 * 1000; // 5 minutes in ms
    const triggerPromiseEpoch = Date.now() + snoozeDurationMs;

    // Track snoozed item
    setSnoozedAlarms((prev) => [
      ...prev.filter((s) => s.alarmId !== activeAlarm.id),
      { alarmId: activeAlarm.id, triggerAt: triggerPromiseEpoch }
    ]);

    // Update historical local label trace to show user it's snoozing
    setActiveAlarm(null);
  };

  // Handle Dismiss command (Stops currently active ringing sound)
  const handleDismiss = () => {
    if (!activeAlarm) return;
    killAlarmEffects();

    // Reset snooze status
    setSnoozedAlarms((prev) => prev.filter((s) => s.alarmId !== activeAlarm.id));
    setActiveAlarm(null);
  };

  // Save new Alarm configuration
  const handleAddAlarm = (e: FormEvent) => {
    e.preventDefault();

    const newAlarm: Alarm = {
      id: 'alarm-' + Date.now(),
      time: timeInput,
      label: labelInput.trim() || '⏰ 我設定的時間點',
      repeatType: repeatTypeInput,
      repeatDays: repeatTypeInput === 'weekly' ? [...repeatDaysInput] : [],
      soundType: soundTypeInput,
      volume: volumeInput,
      simulateCall: simulateCallInput,
      vibrate: vibrateInput,
      showNotification: showNotificationInput,
      enabled: true,
      isStrong: isStrongInput,
      snoozeCount: 0,
      lastTriggeredDate: null
    };

    const updated = [newAlarm, ...alarms].sort((a, b) => a.time.localeCompare(b.time));
    setAlarms(updated);
    saveAlarms(updated);

    // Reset Form Input
    setIsAdding(false);
    setLabelInput('');
    setRepeatTypeInput('once');
    setRepeatDaysInput([]);
    setSoundTypeInput('chime');
    setVolumeInput(0.8);
    setSimulateCallInput(false);
    setVibrateInput(true);
    setIsStrongInput(false);
    setShowNotificationInput(true);
  };

  // Handle Editing Inline Alarm
  const handleSaveEdit = (edited: Alarm) => {
    const updated = alarms.map((al) => (al.id === edited.id ? edited : al)).sort((a, b) => a.time.localeCompare(b.time));
    setAlarms(updated);
    saveAlarms(updated);
    setEditingAlarmId(null);
  };

  // Remove individual alarm item
  const handleDeleteAlarm = (id: string) => {
    const filtered = alarms.filter((al) => al.id !== id);
    setAlarms(filtered);
    saveAlarms(filtered);
    // clean from active snoozes
    setSnoozedAlarms((prev) => prev.filter((s) => s.alarmId !== id));
    if (editingAlarmId === id) setEditingAlarmId(null);
  };

  // Toggle alarm enable status switch
  const handleToggleEnabled = (id: string) => {
    const updated = alarms.map((al) => {
      if (al.id === id) {
        const nextEnabledState = !al.enabled;
        return { 
          ...al, 
          enabled: nextEnabledState,
          // Reset trigger block if enabling/disabling to allow same minute tests
          lastTriggeredDate: null 
        };
      }
      return al;
    });
    setAlarms(updated);
    saveAlarms(updated);
    if (!updated.find(al => al.id === id)?.enabled) {
      setSnoozedAlarms((prev) => prev.filter((s) => s.alarmId !== id));
    }
  };

  // Clear data completely with double confirmation safety
  const handleClearAllData = () => {
    const check = confirm('⚠️ 確定要清除所有鬧鐘排程，回到系統預設初始配製嗎？這項操作無法復原。');
    if (check) {
      killAlarmEffects();
      const defaults = clearAlarmsToDefault();
      setAlarms(defaults);
      setSnoozedAlarms([]);
      setActiveAlarm(null);
      setEditingAlarmId(null);
      alert('所有小鬧鐘資料已重新設定為出廠狀態！');
    }
  };

  // Download raw JSON configs
  const handleDownloadJSON = () => {
    try {
      const dataStr = exportConfig(alarms);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const uploadFileName = `小鬧鐘備份_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', uploadFileName);
      linkElement.click();
    } catch (e) {
      alert('備份失敗：' + e);
    }
  };

  // Drag-and-drop / select JSON config import
  const handleUploadJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importConfig(text);
        setAlarms(imported);
        setUploadError(null);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4000);
      } catch (err: any) {
        setUploadError(err.message || '檔案解析出錯');
        setUploadSuccess(false);
      }
    };
    reader.readAsText(file);
    // clear input
    if (e.target) e.target.value = '';
  };

  // Toggle Weekdays inside list builder
  const toggleWeekdaySelection = (day: number, currentList: number[], setter: (val: number[]) => void) => {
    if (currentList.includes(day)) {
      setter(currentList.filter(d => d !== day));
    } else {
      setter([...currentList, day].sort());
    }
  };

  const getWeekdayString = (days: number[]) => {
    if (days.length === 0) return '未選擇星天';
    if (days.length === 7) return '每天';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return '每週工作日';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return '每週末';
    
    const labelMapping = ['日', '一', '二', '三', '四', '五', '六'];
    return '每週 ' + days.map(d => labelMapping[d]).join(', ');
  };

  // Play short sound snippet for test validation
  const triggerSoundTest = (type: 'buzzer' | 'ringtone' | 'chime' | 'silent') => {
    if (type === 'silent') return;
    setTestPlayingType(type);
    testSound(type, volumeInput);
    setTimeout(() => {
      setTestPlayingType(null);
    }, 1500);
  };

  const formatStopwatchTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen pb-20 relative px-4 sm:px-6 w-full max-w-5xl mx-auto flex flex-col font-sans">
      
      {/* Absolute ringing state overlays */}
      {activeAlarm && (
        activeAlarm.simulateCall ? (
          <CallSimulator 
            activeAlarm={activeAlarm}
            onDecline={handleSnooze}
            onAccept={handleDismiss}
          />
        ) : (
          <AlarmRingingScreen 
            activeAlarm={activeAlarm}
            onSnooze={handleSnooze}
            onDismiss={handleDismiss}
          />
        )
      )}

      {/* Floating Snooze banners */}
      {snoozedAlarms.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full bg-[#050508]/90 border border-cyan-500/30 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3">
            <RefreshCcw className="w-5 h-5 text-cyan-400 animate-spin" />
            <div>
              <p className="text-sm font-bold">小鬧鐘正在貪睡中...</p>
              <p className="text-xs text-slate-400 font-mono">
                5 分鐘後將再次響起
              </p>
            </div>
          </div>
          <button 
            onClick={() => setSnoozedAlarms([])}
            className="text-xs bg-cyan-500 text-[#050508] font-bold py-1.5 px-3 rounded-lg hover:bg-cyan-600 transition-colors"
          >
            全部取消
          </button>
        </div>
      )}

      {/* 1. Header Branded Navigation Area */}
      <header className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bell className="w-5 h-5 text-[#050508] stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              小鬧鐘 <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono">PWA PRO</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">極簡微光設計的網頁定時提醒管家</p>
          </div>
        </div>

        {/* Master system notification prompt notification panel */}
        <div className="flex flex-wrap items-center gap-2">
          {notificationPermission !== 'granted' ? (
            <button
              id="btn-request-permission"
              onClick={requestNotificationPermission}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-[#050508] bg-cyan-500/10 hover:bg-cyan-400 px-3 py-1.5 rounded-lg border border-cyan-500/20 cursor-pointer transition-all active:scale-95"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              啟用系統通知與震動
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
              <Check className="w-3.5 h-3.5" />
              已核准瀏覽器通知
            </span>
          )}

          <button
            id="btn-factory-reset"
            onClick={handleClearAllData}
            title="清空紀錄回到出廠設定"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-955/20 px-3 py-1.5 rounded-lg border border-white/10 hover:border-rose-900/30 transition-all cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            重設系統
          </button>
        </div>
      </header>

      {/* Frame Sandboxing Banner Warning if notifications are blocked inside AI Studio preview frame */}
      <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-xs flex flex-col md:flex-row items-center gap-4 justify-between leading-relaxed">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <span className="text-cyan-400 font-bold">⚠️ 沙盒環境提示：</span>
            本網頁鬧鐘使用高精度 Web Audio API 振盪器與 Local Cookie 儲存。若將此應用
            <span className="text-white font-bold bg-white/10 px-1 rounded mx-1">在新分頁中打開</span>，即可免除 iframe 網域限制，獲得完好的本機震動 (Vibration) 與推播通知。
          </div>
        </div>
        <a 
          href={window.location.href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="shrink-0 bg-cyan-400/10 hover:bg-cyan-400 hover:text-[#050508] border border-cyan-400/20 text-cyan-400 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center w-full md:w-auto"
        >
          在新分頁開啟 ↗
        </a>
      </div>

      {/* 2. Main Current Clock Dashboard */}
      <section className="mb-8" id="clock-live-indicator">
        <ClockDashboard />
      </section>

      {/* --- Quick Countdown & Stopwatch Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Timer Card */}
        <section className="rounded-[32px] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isCountdownRunning ? 'bg-cyan-500 text-[#050508] animate-pulse' : 'bg-white/5 text-cyan-400'}`}>
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">快速倒數計時器</h3>
                <p className="text-xs text-slate-400">設定時分後立即開始倒數</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full">
              {isCountdownRunning ? (
                <div className="flex items-center gap-6 bg-black/40 px-6 py-3 rounded-2xl border border-cyan-500/30 w-full justify-between">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="text-3xl font-black font-mono text-cyan-400 tracking-tighter">
                      {Math.floor(countdownSeconds / 3600).toString().padStart(2, '0')}:
                      {Math.floor((countdownSeconds % 3600) / 60).toString().padStart(2, '0')}:
                      {(countdownSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    {countdownStartTime && (
                      <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        開始於 {countdownStartTime}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsCountdownRunning(false);
                      setCountdownSeconds(0);
                      setCountdownStartTime(null);
                    }}
                    className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-rose-500/20"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                  <div className="flex items-center gap-2 bg-black/40 rounded-2xl border border-white/10 px-4 py-2 w-full justify-center">
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={timerInputHours}
                        onChange={(e) => setTimerInputHours(parseInt(e.target.value) || 0)}
                        className="w-10 bg-transparent text-xl font-bold font-mono text-white focus:outline-none text-center"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">HR</span>
                    </div>
                    <span className="text-white font-bold">:</span>
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={timerInputMinutes}
                        onChange={(e) => setTimerInputMinutes(parseInt(e.target.value) || 0)}
                        className="w-10 bg-transparent text-xl font-bold font-mono text-white focus:outline-none text-center"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">MIN</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const totalSecs = (timerInputHours * 3600) + (timerInputMinutes * 60);
                      if (totalSecs > 0) {
                        const now = new Date();
                        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                        setCountdownStartTime(timeStr);
                        setCountdownSeconds(totalSecs);
                        setIsCountdownRunning(true);
                      }
                    }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-[#050508] px-6 py-4 rounded-2xl text-sm font-black transition-all shadow-lg shadow-cyan-500/20 active:scale-95 w-full sm:w-auto whitespace-nowrap"
                  >
                    開始
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stopwatch Card */}
        <section className="rounded-[32px] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isStopwatchRunning ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/5 text-indigo-400'}`}>
                <Hourglass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">數位碼表</h3>
                <p className="text-xs text-slate-400">精確計時與分圈記錄功能</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-black/40 px-6 py-3 rounded-2xl border border-white/10 w-full">
                <div className="text-3xl font-black font-mono text-indigo-400 tracking-tighter">
                  {formatStopwatchTime(stopwatchSeconds)}
                </div>
                <div className="flex items-center gap-2">
                  {isStopwatchRunning ? (
                    <button
                      onClick={() => setIsStopwatchRunning(false)}
                      className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-rose-500/20"
                    >
                      停止
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsStopwatchRunning(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                      {stopwatchSeconds > 0 ? '繼續' : '開始'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsStopwatchRunning(false);
                      setStopwatchSeconds(0);
                      setStopwatchLaps([]);
                    }}
                    className="bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
                  >
                    重設
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={!isStopwatchRunning}
                  onClick={() => setStopwatchLaps([stopwatchSeconds, ...stopwatchLaps].slice(0, 5))}
                  className="flex-1 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Flag className="w-3 h-3 inline-block mr-1 mb-0.5" />
                  紀錄分圈 (LAP)
                </button>
              </div>

              {stopwatchLaps.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  {stopwatchLaps.map((lap, i) => (
                    <span key={i} className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-slate-400">
                      Lap {stopwatchLaps.length - i}: {formatStopwatchTime(lap)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Primary Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Form / Add Area (5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="rounded-[32px] border border-white/10 bg-white/[0.02] p-5 shadow-sm space-y-4 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 font-mono" />
                新增提醒
              </h3>
              {!isAdding && (
                <button
                  id="btn-expand-add-form"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 bg-cyan-400 hover:bg-cyan-500 text-[#050508] font-bold py-1.5 px-3.5 rounded-xl text-xs shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  建立鬧鐘
                </button>
              )}
            </div>

            {isAdding ? (
              <form onSubmit={handleAddAlarm} className="space-y-4 animate-fade-in" id="add-alarm-form">
                
                {/* Time Picker segment */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">⏰ 設定時間 (24小時制)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      required
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xl font-bold font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Alarm Label */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">✍️ 提醒名稱 / 吃藥等說明</label>
                  <input 
                    type="text" 
                    placeholder="例如：提醒吃藥、喝水、準備開會"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-650"
                  />
                </div>

                {/* Repetition Type Selection */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5">🗓️ 重複頻率</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 border border-white/10 rounded-xl">
                    {(['once', 'daily', 'weekly'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRepeatTypeInput(type)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all select-none ${
                          repeatTypeInput === type 
                            ? 'bg-cyan-500 text-[#050508]' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {type === 'once' ? '僅一次' : type === 'daily' ? '每天' : '每週特定'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weekly day checkboxes if weekly repetition is chosen */}
                {repeatTypeInput === 'weekly' && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl animate-fade-in">
                    <label className="block text-[11px] text-slate-400 font-bold mb-2">選擇每週響鈴天份：</label>
                    <div className="grid grid-cols-7 gap-1">
                      {['日', '一', '二', '三', '四', '五', '六'].map((dayName, idx) => {
                        const isSelected = repeatDaysInput.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleWeekdaySelection(idx, repeatDaysInput, setRepeatDaysInput)}
                            className={`py-2 rounded-lg text-[10px] font-bold transition-all ${
                              isSelected 
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                                : 'bg-white/5 text-slate-400 border border-white/5'
                            }`}
                          >
                            {dayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sound preset selector */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold mb-1.5 flex justify-between items-center">
                    <span>🎵 提醒音效設定</span>
                    {soundTypeInput !== 'silent' && (
                      <button
                        type="button"
                        onClick={() => triggerSoundTest(soundTypeInput)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                      >
                        {testPlayingType === soundTypeInput ? (
                          <>
                            <Square className="w-2.5 h-2.5 fill-current" />
                            播放中
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            測試播放
                          </>
                        )}
                      </button>
                    )}
                  </label>
                  <select
                    value={soundTypeInput}
                    onChange={(e) => setSoundTypeInput(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="chime" className="bg-[#050508] text-white">🎈 溫和喚醒八音盒</option>
                    <option value="ringtone" className="bg-[#050508] text-white">📞 經典電話電鈴</option>
                    <option value="buzzer" className="bg-[#050508] text-white">🚨 蜂鳴高頻警示器</option>
                    <option value="silent" className="bg-[#050508] text-white">🔕 靜音 (僅文字/震動)</option>
                  </select>
                </div>

                {/* Interactive Toggles for PWA features */}
                <div className="space-y-2.5 bg-black/40 p-3.5 rounded-xl border border-white/10">
                  <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">
                    硬體配備與視窗效果
                  </span>

                  {/* Simulate Call */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                    <span className="text-slate-300">📱 啟用模擬來電畫面</span>
                    <input 
                      type="checkbox"
                      checked={simulateCallInput}
                      onChange={(e) => setSimulateCallInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-cyan-500 relative transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                  </label>

                  {/* Vibrate */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                    <span className="text-slate-300">📳 啟用裝置震動回饋</span>
                    <input 
                      type="checkbox"
                      checked={vibrateInput}
                      onChange={(e) => setVibrateInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-cyan-500 relative transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                  </label>

                  {/* Show Notification message */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                    <span className="text-slate-300">💬 顯示提示文字訊息</span>
                    <input 
                      type="checkbox"
                      checked={showNotificationInput}
                      onChange={(e) => setShowNotificationInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-cyan-500 relative transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                  </label>

                  {/* Strong Wake-up */}
                  <label className="flex items-center justify-between text-xs cursor-pointer select-none group">
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      啟動「強力叫醒」模式
                    </span>
                    <input 
                      type="checkbox"
                      checked={isStrongInput}
                      onChange={(e) => setIsStrongInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-rose-500 relative transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4 shadow-[0_0_10px_rgba(244,63,94,0)] peer-checked:shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="w-1/3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all border border-white/5"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2 bg-cyan-500 hover:bg-cyan-600 text-[#050508] font-bold rounded-xl text-xs shadow-lg transition-all"
                  >
                    儲存鬧鐘
                  </button>
                </div>

              </form>
            ) : (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-slate-500 flex flex-col items-center justify-center gap-2">
                <p className="text-xs">建立您自訂的定時吃藥或工作提醒</p>
                <button
                  id="btn-trigger-add"
                  onClick={() => setIsAdding(true)}
                  className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold underline transition-colors"
                >
                  點擊展開設定面板 ↗
                </button>
              </div>
            )}
          </div>

          {/* Device Migration (Upload / Download Configuration) */}
          <div className="rounded-[32px] border border-white/10 bg-white/[0.02] p-5 space-y-4 backdrop-blur-md">
            <h3 className="text-xs font-semibold text-slate-350 uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400 font-mono" />
              備份與移機同步
            </h3>
            <p className="text-[11px] text-slate-450 leading-relaxed">
              需要更換手機或清除瀏覽器 Cookie 歷史紀錄？
              將設定匯出成 JSON 備份檔，隨時可在其他裝置輕鬆匯入。
            </p>

            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Reset trigger */}
              <button
                id="btn-download-config"
                onClick={handleDownloadJSON}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 transition-all select-none cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                下載備份
              </button>

              <button
                id="btn-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 transition-all select-none cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                匯入備份
              </button>

              {/* Hidden file selector */}
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".json"
                onChange={handleUploadJSON}
                className="hidden" 
              />
            </div>

            {uploadSuccess && (
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                備份檔案成功匯入，時間已同步！
              </div>
            )}

            {uploadError && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-center font-bold text-[11px] flex items-center justify-center gap-1 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                錯誤: {uploadError}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Active Alarms List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="rounded-[32px] border border-white/10 bg-white/[0.02] p-5 space-y-4 backdrop-blur-md">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400 font-mono" />
                目前小鬧鐘排程 ({alarms.length})
              </h3>
              
              <span className="text-[11px] text-slate-500 font-medium">
                每條提醒皆安全儲存於 Cookie
              </span>
            </div>

            {alarms.length === 0 ? (
              <div className="text-center py-16 text-slate-500 border border-dashed border-white/10 rounded-[24px]">
                <AlertTriangle className="w-10 h-10 text-cyan-400/30 mx-auto mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-slate-400">尚無設置任何小鬧鐘排程</p>
                <p className="text-xs opacity-60 mt-1">請使用左側控制區快速建立或重設系統為預設</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {alarms.map((alarm) => {
                  const isEditing = editingAlarmId === alarm.id;
                  
                  return (
                    <div
                      key={alarm.id}
                      id={`alarm-card-${alarm.id}`}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
                        alarm.enabled 
                          ? 'bg-white/[0.03] border-white/15 hover:border-cyan-500/30 shadow-md hover:shadow-cyan-950/10' 
                          : 'bg-black/20 opacity-50 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {isEditing ? (
                        /* Editing Form Mode */
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                            <span className="text-xs font-bold text-cyan-400">編輯鬧鐘設定</span>
                            <button
                              type="button"
                              onClick={() => setEditingAlarmId(null)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">響鈴時間</label>
                              <input 
                                type="time"
                                value={alarm.time}
                                onChange={(e) => {
                                  handleSaveEdit({ ...alarm, time: e.target.value });
                                }}
                                className="w-full bg-[#050508] border border-white/15 rounded-lg px-3 py-1.5 text-base font-bold font-mono text-white focus:outline-none focus:border-cyan-500/50"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold mb-1">提醒說明文字</label>
                              <input 
                                type="text"
                                value={alarm.label}
                                onChange={(e) => {
                                  handleSaveEdit({ ...alarm, label: e.target.value });
                                }}
                                className="w-full bg-[#050508] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
                            {/* Re-trigger type */}
                            <div>
                              <span className="block text-[10px] text-slate-400 font-bold mb-1">重複度</span>
                              <select
                                value={alarm.repeatType}
                                onChange={(e) => {
                                  const rType = e.target.value as any;
                                  handleSaveEdit({ 
                                    ...alarm, 
                                    repeatType: rType,
                                    repeatDays: rType === 'weekly' ? [1, 2, 3, 4, 5] : [] 
                                  });
                                }}
                                className="bg-[#050508] border border-white/10 rounded px-2 py-1 text-xs w-full text-white"
                              >
                                <option value="once" className="bg-[#050508]">一次</option>
                                <option value="daily" className="bg-[#050508]">每天</option>
                                <option value="weekly" className="bg-[#050508]">每週</option>
                              </select>
                            </div>

                            {/* Sound picker */}
                            <div>
                              <span className="block text-[10px] text-slate-400 font-bold mb-1">鈴聲音效</span>
                              <select
                                value={alarm.soundType}
                                onChange={(e) => {
                                  handleSaveEdit({ ...alarm, soundType: e.target.value as any });
                                }}
                                className="bg-[#050508] border border-white/10 rounded px-2 py-1 text-xs w-full text-white"
                              >
                                <option value="chime" className="bg-[#050508]">溫和音效</option>
                                <option value="ringtone" className="bg-[#050508]">電話鈴聲</option>
                                <option value="buzzer" className="bg-[#050508]">蜂鳴器</option>
                                <option value="silent" className="bg-[#050508]">靜音模式</option>
                              </select>
                            </div>

                            {/* Sound volume slider */}
                            <div>
                              <span className="block text-[10px] text-slate-400 font-bold mb-1">響亮音量: {Math.round(alarm.volume * 100)}%</span>
                              <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1"
                                value={alarm.volume}
                                onChange={(e) => {
                                  handleSaveEdit({ ...alarm, volume: parseFloat(e.target.value) });
                                }}
                                className="w-full accent-cyan-500"
                              />
                            </div>
                          </div>

                          {/* Detail switches in edit mode */}
                          <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-400">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={alarm.simulateCall}
                                onChange={(e) => handleSaveEdit({ ...alarm, simulateCall: e.target.checked })}
                                className="rounded text-cyan-500 bg-black border-white/10"
                              />
                              來電模擬功能
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={alarm.vibrate}
                                onChange={(e) => handleSaveEdit({ ...alarm, vibrate: e.target.checked })}
                                className="rounded text-cyan-500 bg-black border-white/10"
                              />
                              震動支援
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={alarm.showNotification}
                                onChange={(e) => handleSaveEdit({ ...alarm, showNotification: e.target.checked })}
                                className="rounded text-cyan-500 bg-black border-white/10"
                              />
                              顯示提示訊息與文字
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-rose-400 font-bold">
                              <input 
                                type="checkbox"
                                checked={alarm.isStrong}
                                onChange={(e) => handleSaveEdit({ ...alarm, isStrong: e.target.checked })}
                                className="rounded text-rose-500 bg-black border-white/10"
                              />
                              強力叫醒模式
                            </label>
                          </div>

                          {/* Repeater Day Pickers inline editor if weekly repeat type selected */}
                          {alarm.repeatType === 'weekly' && (
                            <div className="p-2.5 bg-black/40 rounded border border-white/10 animate-fade-in">
                              <span className="block text-[9px] font-bold text-cyan-400 mb-1.5 font-mono">響鈴特定天份：</span>
                              <div className="flex gap-2 justify-between">
                                {['日', '一', '二', '三', '四', '五', '六'].map((dayName, indexValue) => {
                                  const contains = alarm.repeatDays.includes(indexValue);
                                  return (
                                    <button
                                      key={indexValue}
                                      type="button"
                                      onClick={() => {
                                        const replacement = contains 
                                          ? alarm.repeatDays.filter(k => k !== indexValue)
                                          : [...alarm.repeatDays, indexValue].sort();
                                        handleSaveEdit({ ...alarm, repeatDays: replacement });
                                      }}
                                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                        contains 
                                          ? 'bg-cyan-500 text-[#050508] shadow' 
                                          : 'bg-[#050508] text-slate-400 border border-white/10'
                                      }`}
                                    >
                                      {dayName}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-2 text-xs pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingAlarmId(null)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded font-semibold transition-colors"
                            >
                              關閉編輯
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard View Mode */
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          
                          <div className="flex items-start gap-4">
                            {/* Toggle Alarm Toggle */}
                            <button
                              onClick={() => handleToggleEnabled(alarm.id)}
                              id={`btn-toggle-${alarm.id}`}
                              className={`w-12 py-2 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 cursor-pointer ${
                                alarm.enabled 
                                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' 
                                  : 'bg-black/25 border-white/5 text-slate-500 hover:bg-white/5'
                              }`}
                              title={alarm.enabled ? "點選停用" : "點選啟用"}
                            >
                              <Bell className={`w-5 h-5 ${alarm.enabled ? 'animate-pulse text-cyan-400' : ''}`} />
                            </button>

                            {/* Alarm Details */}
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-extrabold font-mono tracking-tight transition-colors ${alarm.enabled ? 'text-white' : 'text-slate-550'}`}>
                                  {alarm.time}
                                </span>
                                
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  alarm.repeatType === 'once' 
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' 
                                    : alarm.repeatType === 'daily' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
                                }`}>
                                  {alarm.repeatType === 'once' ? '單次' : alarm.repeatType === 'daily' ? '每天定時' : '每週重複'}
                                </span>
                              </div>

                              <h4 className={`text-sm font-semibold mt-1 transition-colors ${alarm.enabled ? 'text-slate-200' : 'text-slate-500'}`}>
                                {alarm.label}
                              </h4>

                              {/* Frequency summary text */}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-450 font-mono">
                                <span>
                                  {alarm.repeatType === 'weekly' ? getWeekdayString(alarm.repeatDays) : '不限星期天份'}
                                </span>
                                <span className="text-slate-750 font-sans">•</span>
                                <span>
                                  音效: {alarm.soundType === 'chime' ? '八音盒' : alarm.soundType === 'ringtone' ? '電話來電音' : alarm.soundType === 'buzzer' ? '電子蜂鳴' : '靜音'}
                                </span>
                              </div>

                              {/* Badge indicators */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {alarm.simulateCall && (
                                  <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                    Simulate Call 來電
                                  </span>
                                )}
                                {alarm.vibrate && (
                                  <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                    Vibration 震動
                                  </span>
                                )}
                                {alarm.showNotification && (
                                  <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                    Text Msg 提示
                                  </span>
                                )}
                                {alarm.isStrong && (
                                  <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase flex items-center gap-0.5">
                                    <Zap className="w-2 h-2" />
                                    Strong 強力
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions Panel */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 self-stretch sm:self-auto">
                            
                            {/* Toggle Alarm switch */}
                            <button
                              onClick={() => {
                                setEditingAlarmId(isEditing ? null : alarm.id);
                              }}
                              className="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold cursor-pointer"
                            >
                              變更設定 / 編輯
                            </button>

                            <button
                              onClick={() => handleDeleteAlarm(alarm.id)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/20 border border-white/5 hover:border-rose-900/30 text-slate-400 hover:text-rose-450 transition-all cursor-pointer"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 p-6 bg-white/[0.01] leading-relaxed backdrop-blur-md">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400 font-mono" />
              常見 PWA 鬧鐘使用說明指南：
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 font-sans leading-relaxed">
              <li>
                <span className="text-white font-semibold">重複度設定：</span>
                包含「單次 (只響一次即停用)」、「每天定時」與「每週特定天數重複 (可挑選多重星期日到六)」。
              </li>
              <li>
                <span className="text-white font-semibold">模擬來電：</span>
                若開啟「來電模擬畫面」，鬧鐘響起時將切換至精緻的手機「接聽」與「拒絕來電」動畫，完美融入生活習慣。
              </li>
              <li>
                <span className="text-white font-semibold">資料安全防護：</span>
                每條定時排程皆安全儲存於您本機安全 Cookie 與 Local Cache。除非您手動點擊「重設系統」，否則資料絕對不會遺失。
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Footer / Stats Area */}
      <footer className="mt-12 py-6 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] font-bold tracking-widest uppercase text-slate-500">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            全站瀏覽量: <span id="vercount_value_site_pv" className="text-cyan-400">--</span> 次
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            獨立訪客: <span id="vercount_value_site_uv" className="text-indigo-400">--</span> 人
          </span>
          <button 
            onClick={() => (window as any).vercount?.fetch()}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[9px] text-slate-400 hover:text-cyan-400 transition-all active:scale-95"
          >
            手動刷新計數
          </button>
        </div>
        <p className="text-[10px] text-slate-600 font-medium">
          © {new Date().getFullYear()} 小鬧鐘 PWA • Designed for Luna AI Hub
        </p>
      </footer>
    </div>
  );
}
