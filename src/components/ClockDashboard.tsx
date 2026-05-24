import { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck } from 'lucide-react';

export default function ClockDashboard() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDigital = () => {
    const hrs = String(time.getHours()).padStart(2, '0');
    const mins = String(time.getMinutes()).padStart(2, '0');
    const secs = String(time.getSeconds()).padStart(2, '0');
    return { hrs, mins, secs };
  };

  const getChineseDateStr = () => {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const year = time.getFullYear();
    const month = time.getMonth() + 1;
    const date = time.getDate();
    const day = weekDays[time.getDay()];
    return `${year} 年 ${month} 月 ${date} 日 (${day})`;
  };

  const { hrs, mins, secs } = formatDigital();

  // Calculating hands degrees for a micro analog visual
  const hrDeg = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;
  const minDeg = time.getMinutes() * 6 + time.getSeconds() * 0.1;
  const secDeg = time.getSeconds() * 6;

  return (
    <div 
      id="clock-dashboard-root"
      className="relative overflow-hidden rounded-[32px] bg-white/[0.02] border border-white/10 p-6 md:p-8 shadow-2xl transition-all duration-300 hover:border-cyan-500/20"
    >
      {/* Background ambient light */}
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-indigo-500/5 blur-3xl animate-pulse" />

      <div className="relative flex flex-col md:flex-row items-center gap-6 justify-between z-10">
        
        {/* Left pane: Date & Tech indicators */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            系統時間同步中
          </span>
          
          <h2 className="text-xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            {getChineseDateStr()}
          </h2>
          
          <p className="text-sm font-mono text-zinc-400 max-w-sm">
            本裝置支援 PWA 背景運作。
            <br />
            請保持此分頁開啟以獲取高精準提醒。
          </p>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cookie 安全防護與離線備份已啟用
          </div>
        </div>

        {/* Right pane: Digital Time Display + Mini Analog Clock */}
        <div className="flex items-center gap-6 select-none">
          {/* Mini Analog Indicator */}
          <div className="relative w-20 h-20 rounded-full border border-white/10 bg-black/40 hidden sm:flex items-center justify-center">
            {/* Center dot */}
            <div className="absolute w-2 h-2 rounded-full bg-cyan-400 z-10" />
            {/* Hour hand */}
            <div 
              className="absolute bg-zinc-100 rounded-full origin-bottom" 
              style={{
                width: '3px',
                height: '18px',
                bottom: '40px',
                transform: `rotate(${hrDeg}deg)`,
                transition: 'transform 0.5s ease-out'
              }}
            />
            {/* Minute hand */}
            <div 
              className="absolute bg-zinc-400 rounded-full origin-bottom" 
              style={{
                width: '2px',
                height: '26px',
                bottom: '40px',
                transform: `rotate(${minDeg}deg)`,
                transition: 'transform 0.5s ease-out'
              }}
            />
            {/* Second hand */}
            <div 
              className="absolute bg-cyan-400 rounded-full origin-bottom" 
              style={{
                width: '1px',
                height: '28px',
                bottom: '40px',
                transform: `rotate(${secDeg}deg)`
              }}
            />
            {/* 12, 3, 6, 9 marks */}
            <span className="absolute top-1 text-[8px] font-mono text-zinc-500">12</span>
            <span className="absolute right-1 text-[8px] font-mono text-zinc-500">3</span>
            <span className="absolute bottom-1 text-[8px] font-mono text-zinc-500">6</span>
            <span className="absolute left-1 text-[8px] font-mono text-zinc-500">9</span>
          </div>

          {/* Digital Numbers */}
          <div className="flex items-baseline gap-1" id="digital-clock-display">
            <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-md">
              <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tight text-white glow-cyan">
                {hrs}
              </span>
            </div>
            
            <span className="text-3xl font-bold text-cyan-400 animate-pulse px-1">:</span>
            
            <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-md">
              <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold tracking-tight text-white glow-cyan">
                {mins}
              </span>
            </div>
            
            <span className="text-2xl font-mono text-zinc-500 ml-2 select-none self-end pb-3">
              {secs}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
