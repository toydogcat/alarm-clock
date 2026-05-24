import { Bell, Clock, Compass, Volume2, ShieldAlert } from 'lucide-react';
import { Alarm } from '../types';

interface AlarmRingingScreenProps {
  activeAlarm: Alarm;
  onSnooze: () => void;
  onDismiss: () => void;
}

export default function AlarmRingingScreen({ activeAlarm, onSnooze, onDismiss }: AlarmRingingScreenProps) {
  return (
    <div 
      id="alarm-ringing-overlay"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#050508] p-6 md:p-8 text-white select-none animate-fade-in"
    >
      {/* Visual Ambient Rings */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <div className="w-96 h-96 rounded-full border border-cyan-500/10 animate-[ping_3s_infinite]" />
        <div className="w-128 h-128 rounded-full border border-cyan-500/5 animate-[ping_4s_infinite] delay-1000" />
      </div>

      {/* Top logo & status */}
      <div className="flex justify-between items-center w-full max-w-lg mx-auto mt-8 z-10 px-4">
        <span className="flex items-center gap-1.5 text-xs tracking-wider text-cyan-400 uppercase font-mono">
          <Bell className="w-4 h-4 animate-bounce" />
          {activeAlarm.isStrong ? 'Strong Wake-up active' : 'Alarm Ringing'}
        </span>
        <span className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400 font-mono">
          Snoozed: {activeAlarm.snoozeCount} 次
        </span>
      </div>

      {/* Main Clock / Ring Info Center */}
      <div className="flex flex-col items-center justify-center text-center z-10 max-w-lg mx-auto w-full my-auto">
        {/* Pulsing Alarm Icon */}
        <div className="relative mb-8">
          <div className={`w-24 h-24 rounded-full ${activeAlarm.isStrong ? 'bg-rose-500 shadow-rose-500/40' : 'bg-cyan-500 shadow-cyan-500/20'} text-[#050508] flex items-center justify-center shadow-2xl active:scale-95 transition-transform duration-100`}>
            <Bell className="w-12 h-12 animate-swing" />
          </div>
          <span className={`absolute inset-0 rounded-full border-4 ${activeAlarm.isStrong ? 'border-rose-500' : 'border-cyan-500'} animate-ping opacity-30`} />
        </div>

        {/* Large Time Indicator */}
        <h2 className={`text-6xl md:text-7xl font-extrabold tracking-tighter text-white font-mono mb-4 ${activeAlarm.isStrong ? 'text-glow-rose' : 'text-glow-cyan'}`}>
          {activeAlarm.time}
        </h2>

        {/* Action Title / Custom message */}
        <div className={`bg-white/5 border ${activeAlarm.isStrong ? 'border-rose-500/30' : 'border-white/10'} rounded-2xl p-6 w-full shadow-lg backdrop-blur-md`}>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            貼心提醒內容
          </div>
          
          <p className={`text-2xl font-bold ${activeAlarm.isStrong ? 'text-rose-100' : 'text-cyan-100'} leading-snug`}>
            {activeAlarm.showNotification ? (activeAlarm.label || '提醒您，時鐘響囉！') : '🔓 鬧鐘提醒已啟動'}
          </p>

          {activeAlarm.isStrong && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 py-1.5 px-3 rounded-lg border border-rose-500/20 animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              強力叫醒模式已啟動：請立即起床！
            </div>
          )}

          {!activeAlarm.showNotification && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 bg-black/40 py-1.5 px-3 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              此時鐘已啟用「隱藏提示文字」隱私模式
            </div>
          )}
        </div>
      </div>

      {/* Action panel */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 z-10 w-full max-w-lg mx-auto">
        {/* Snooze button (Snooze 5 mins) */}
        <button
          id="alarm-btn-snooze"
          onClick={onSnooze}
          className="w-full sm:w-1/2 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.98] transition-all font-bold text-center text-slate-100 flex items-center justify-center gap-2 shadow-lg"
        >
          <Clock className="w-5 h-5 text-cyan-400" />
          貪睡 5 分鐘 (Snooze)
        </button>

        {/* Stop button (Dismiss) */}
        <button
          id="alarm-btn-dismiss"
          onClick={onDismiss}
          className={`w-full sm:w-1/2 py-4 px-6 rounded-2xl ${activeAlarm.isStrong ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/10'} active:scale-[0.98] transition-all font-black text-center text-[#050508] flex items-center justify-center gap-2 shadow-xl`}
        >
          <Volume2 className="w-5 h-5" />
          關閉鬧鐘 (Dismiss)
        </button>
      </div>
    </div>
  );
}
