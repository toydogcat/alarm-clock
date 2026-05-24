import { useState, useEffect } from 'react';
import { Phone, PhoneOff, User, MessageCircle, Volume2 } from 'lucide-react';
import { Alarm } from '../types';

interface CallSimulatorProps {
  activeAlarm: Alarm;
  onDecline: () => void;
  onAccept: () => void;
}

export default function CallSimulator({ activeAlarm, onDecline, onAccept }: CallSimulatorProps) {
  const [callState, setCallState] = useState<'ringing' | 'accepted'>('ringing');
  const [timer, setTimer] = useState(0);

  // Simulated active calling stopwatch
  useEffect(() => {
    let interval: any;
    if (callState === 'accepted') {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div 
      id="call-simulator-overlay"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#050508] p-8 text-white select-none transition-all duration-500 ease-out animate-fade-in"
    >
      {/* Absolute Blurred Vector Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden bg-cover bg-center opacity-30 blur-2xl flex items-center justify-center">
        <div className="w-96 h-96 rounded-full bg-cyan-500/10 filter blur-3xl animate-pulse" />
        <div className="w-80 h-80 rounded-full bg-blue-500/10 filter blur-2xl animate-pulse delay-500" />
      </div>

      {/* Top Section - Metadata & Caller ID */}
      <div className="flex flex-col items-center mt-20 text-center z-10">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-slate-900 border-2 border-cyan-500/40 flex items-center justify-center shadow-2xl shadow-cyan-500/10 overflow-hidden">
            <User className="w-16 h-16 text-slate-400 stroke-1" />
          </div>
          {callState === 'ringing' && (
            <span className="absolute inset-0 rounded-full border-2 border-cyan-500 animate-ping opacity-25" />
          )}
        </div>

        <h1 className="text-3xl font-extrabold tracking-wide mb-2 text-white">
          {activeAlarm.label || '智慧提醒'}
        </h1>
        <p className="text-md text-cyan-400 tracking-wider font-mono uppercase">
          {callState === 'ringing' ? '模擬來電中...' : '系統接聽通話中'}
        </p>

        {callState === 'accepted' && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 font-mono text-xl text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {formatTimer(timer)}
          </div>
        )}
      </div>

      {/* Middle/Bottom Notification message detail */}
      <div className="max-w-md mx-auto w-full z-10 bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 text-center">
        <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-bold">提醒主旨與內容</span>
        </div>
        <p className="text-lg text-white font-medium">
          {activeAlarm.showNotification ? (activeAlarm.label || '鬧鐘提醒您！') : '提醒內容已被設定隱藏'}
        </p>
        <p className="text-xs text-slate-400 mt-2 font-mono">
          設定音效: {activeAlarm.soundType === 'buzzer' ? '電子蜂鳴' : activeAlarm.soundType === 'ringtone' ? '經典鈴聲' : '溫和音效'} | 震動已啟動
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center gap-8 mb-16 z-10 max-w-sm mx-auto w-full">
        {callState === 'ringing' ? (
          <div className="flex justify-between w-full px-8">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                id="call-btn-decline"
                onClick={onDecline}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform duration-100"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <span className="text-xs text-slate-400">拒絕接聽</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                id="call-btn-accept"
                onClick={() => setCallState('accepted')}
                className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-600 active:scale-95 flex items-center justify-center shadow-lg shadow-cyan-500/30 transition-transform duration-100 relative"
              >
                <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-30" />
                <Phone className="w-8 h-8 text-[#050508]" />
              </button>
              <span className="text-xs text-cyan-400 animate-pulse">接聽</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              id="call-btn-hangup"
              onClick={onAccept} // Triggers snooze/close action
              className="w-48 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-transform duration-100"
            >
              <PhoneOff className="w-5 h-5" />
              結束通話與停止提醒
            </button>
            <span className="text-xs text-slate-400">點擊即關閉本次鬧鐘設定</span>
          </div>
        )}
      </div>
    </div>
  );
}
