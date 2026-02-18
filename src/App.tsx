
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Trophy, 
  Flame, 
  AlertCircle, 
  Send, 
  Plus, 
  ChevronRight, 
  Target, 
  ShieldCheck, 
  User, 
  Zap,
  Wallet,
  Check,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  Users,
  DollarSign
} from 'lucide-react';

type View = 'quest' | 'create' | 'vault' | 'feed' | 'profile';
type UserRole = 'owner' | 'supporter';

interface Quest {
  habitName: string;
  targetDays: number;
  bounty: number;
  role: UserRole;
  targetUser?: string;
  day: number;
  checkedInDays: string[];
}

const App = () => {
  const [view, setView] = useState<View>('quest');
  const [quest, setQuest] = useState<Quest>({
    habitName: "No Caffeine",
    targetDays: 30,
    bounty: 100,
    role: 'owner',
    day: 12,
    checkedInDays: (() => {
      const dates = [];
      const today = new Date();
      for (let i = 1; i < 30; i++) {
        if (i === 7 || i === 15) continue;
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    })(),
  });

  // Create Goal Form State
  const [newGoalName, setNewGoalName] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [newBounty, setNewBounty] = useState(100);
  const [isForSelf, setIsForSelf] = useState(true);
  const [targetUserHandle, setTargetUserHandle] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempter, setTempter] = useState('');
  const [penalties, setPenalties] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const progressPercentage = (quest.day / quest.targetDays);
  const securedAmount = (quest.bounty * progressPercentage).toFixed(2);

  useEffect(() => {
    const cachedAvatar = localStorage.getItem('determined_user_avatar');
    if (cachedAvatar) {
      setAvatarUrl(cachedAvatar);
      return;
    }

    const generateAvatar = async () => {
      setIsGeneratingAvatar(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [{ text: 'A relatable meme style cat that looks extremely tired, with heavy dark under-eye circles, looking straight at the camera, digital illustration, simple clean background, expressive and humorous.' }],
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const fullUrl = `data:image/png;base64,${base64Data}`;
            setAvatarUrl(fullUrl);
            localStorage.setItem('determined_user_avatar', fullUrl);
            break;
          }
        }
      } catch (error) {
        console.error("Failed to generate avatar:", error);
      } finally {
        setIsGeneratingAvatar(false);
      }
    };
    generateAvatar();
  }, []);

  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: i === 0,
    };
  });

  const handleCheckIn = () => {
    if (quest.role !== 'owner') return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (quest.checkedInDays.includes(todayStr)) return;

    setQuest(prev => ({
      ...prev,
      day: prev.day + 1,
      checkedInDays: [...prev.checkedInDays, todayStr]
    }));
    
    const btn = document.getElementById('check-in-main-btn');
    btn?.classList.add('scale-90');
    setTimeout(() => btn?.classList.remove('scale-90'), 150);
  };

  const handleCreateQuest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate creation/invitation
    setTimeout(() => {
      setQuest({
        habitName: newGoalName || "No Caffeine",
        targetDays: newDuration,
        bounty: newBounty,
        role: isForSelf ? 'owner' : 'supporter',
        targetUser: isForSelf ? undefined : targetUserHandle,
        day: 0,
        checkedInDays: [],
      });
      setPenalties([]);
      setIsProcessing(false);
      setView('quest');
    }, 1500);
  };

  const renderCreateGoal = () => (
    <div className="max-w-md mx-auto p-6 animate-in slide-in-from-bottom-10 duration-500">
      <button onClick={() => setView('quest')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
        <ChevronLeft size={20} />
        <span className="text-xs font-bold uppercase tracking-widest">Back to Quest</span>
      </button>

      <h1 className="text-4xl font-black tracking-tighter italic uppercase mb-2">New Quest</h1>
      <p className="text-slate-400 text-sm mb-8">Talk is cheap. Show your commitment.</p>

      <form onSubmit={handleCreateQuest} className="space-y-8">
        {/* Habit Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">The Goal</label>
          <input 
            required
            type="text" 
            placeholder="e.g. No Sugar, 6AM Gym, Code daily"
            className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 outline-none transition-all"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
          />
        </div>

        {/* Duration & Bounty */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Duration (Days)</label>
            <div className="relative">
              <input 
                required
                type="number" 
                className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 outline-none"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value))}
              />
              <CalendarIcon className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bounty ($)</label>
            <div className="relative">
              <input 
                required
                type="number" 
                className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 outline-none"
                value={newBounty}
                onChange={(e) => setNewBounty(parseInt(e.target.value))}
              />
              <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
            </div>
          </div>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Who is determined?</label>
          <div className="grid grid-cols-2 gap-2 bg-[#0f0f12] p-2 rounded-2xl border border-white/10">
            <button 
              type="button"
              onClick={() => setIsForSelf(true)}
              className={`py-4 rounded-xl font-bold text-sm transition-all ${isForSelf ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
            >
              Me
            </button>
            <button 
              type="button"
              onClick={() => setIsForSelf(false)}
              className={`py-4 rounded-xl font-bold text-sm transition-all ${!isForSelf ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
            >
              Someone Else
            </button>
          </div>
        </div>

        {!isForSelf && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">THE CHALLENGED</label>
            <input 
              required
              type="text" 
              placeholder="@username"
              className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 font-bold focus:border-pink-500/50 outline-none"
              value={targetUserHandle}
              onChange={(e) => setTargetUserHandle(e.target.value)}
            />
          </div>
        )}

        <button 
          disabled={isProcessing}
          type="submit" 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 py-6 rounded-2xl font-black italic uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isProcessing ? 'INITIATING QUEST...' : 'START COMMITMENT'}
        </button>
      </form>
    </div>
  );

  const renderQuest = () => (
    <div className="max-w-md mx-auto p-6 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Trophy className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            DETERMINED
          </h1>
        </div>
        <button className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all hover:border-purple-500/50">
          {isGeneratingAvatar ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
            <User size={20} className="text-slate-400" />
          )}
        </button>
      </header>

      {/* Main Bounty Display */}
      <section className="relative group mb-8">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-[#0f0f12] border border-white/10 rounded-[2rem] p-8 overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
              {quest.role === 'supporter' ? `SUPPORTING: ${quest.targetUser}` : `YOUR GOAL: ${quest.habitName.toUpperCase()}`}
            </span>
            <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
              <Zap size={10} fill="currentColor" /> LIVE
            </div>
          </div>

          <div className="flex items-baseline gap-6 mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-500 leading-none">$</span>
              <span className="text-7xl font-black tracking-tighter text-white leading-none">
                {quest.bounty}
              </span>
            </div>
            
            <div className="relative flex items-baseline gap-0.5 opacity-90">
              <span className="absolute bottom-full mb-1 left-0 text-[10px] font-bold uppercase tracking-widest text-green-500/80 whitespace-nowrap">Secured</span>
              <span className="text-sm font-bold text-green-500/60 leading-none">$</span>
              <span className="text-3xl font-black text-green-400 tracking-tight leading-none">
                {securedAmount}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0f0f12] bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-slate-200">3 supporters</span> funding this quest
            </p>
          </div>
        </div>
      </section>

      {/* Challenge Progress */}
      <section className="mb-6 p-6 bg-white/5 border border-white/10 rounded-[2rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wallet size={48} />
        </div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h2 className="text-lg font-bold">{quest.habitName}</h2>
          </div>
          <div className="text-right">
            <span className="text-orange-500 flex items-center gap-1 text-sm font-black italic">
              <Flame size={16} fill="currentColor" /> Day {quest.day} of {quest.targetDays}
            </span>
          </div>
        </div>

        <div className="h-2 w-full bg-white/5 rounded-full mb-6 border border-white/5 relative overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage * 100}%` }}
          ></div>
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-between items-end">
          <div>
             <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-1">Status</p>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-300 tracking-tight uppercase">
                  {quest.day === 0 ? 'Starting Quest' : 'Partial Payout Secured'}
                </span>
             </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Risked Balance</p>
            <p className="text-2xl font-black text-slate-400 tracking-tight">${(quest.bounty - parseFloat(securedAmount)).toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <CalendarIcon size={12} className="text-purple-500" /> RESILIENCE LOG
          </h3>
          <span className="text-[10px] text-slate-600 italic">Scroll left for history</span>
        </div>
        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide flex-row-reverse"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {calendarDays.map((d) => {
            const isChecked = quest.checkedInDays.includes(d.dateStr);
            const isMissed = !isChecked && !d.isToday && d.dateStr > '2025-01-01'; // Mocking missed checkins
            
            return (
              <div 
                key={d.dateStr}
                className={`flex-shrink-0 w-14 h-22 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                  d.isToday 
                    ? 'border-purple-500/50 bg-purple-500/10' 
                    : isMissed
                      ? 'border-red-500/20 bg-red-500/5 opacity-80'
                      : 'border-white/5 bg-white/5'
                } ${isChecked ? 'ring-1 ring-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : ''}`}
              >
                <span className={`text-[10px] font-bold uppercase mb-1 ${
                  isChecked ? 'text-green-500' : isMissed ? 'text-red-500/60' : 'text-slate-500'
                }`}>
                  {d.dayName}
                </span>
                <span className={`text-lg font-black leading-none mb-2 ${
                  isChecked ? 'text-white' : isMissed ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {d.dayNum}
                </span>
                
                <div className="h-6 flex items-center justify-center">
                  {isChecked ? (
                    <div className="bg-green-500/20 p-1 rounded-full text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  ) : isMissed ? (
                    <div className="bg-red-500/10 p-1 rounded-full text-red-500/40">
                      <X size={12} strokeWidth={4} />
                    </div>
                  ) : d.isToday ? (
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Supporter View Callout */}
      {quest.role === 'supporter' && (
        <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-4 items-center">
           <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
             <Users size={24} />
           </div>
           <div>
             <h4 className="text-sm font-bold text-blue-200 uppercase tracking-tight">Supporter Mode</h4>
             <p className="text-xs text-blue-400/80 leading-snug">Only the quest owner can check-in. You're here to watch and fund.</p>
           </div>
        </div>
      )}

      {/* The Magic Moment Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full relative group mb-8 active:scale-95 transition-transform"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition"></div>
        <div className="relative bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="font-bold text-red-100 uppercase tracking-tight text-sm">Someone Tempted {quest.role === 'supporter' ? quest.targetUser : 'Me'}</h3>
              <p className="text-xs text-red-300/60">Tap to charge them $10.00</p>
            </div>
          </div>
          <ChevronRight className="text-red-500/50" />
        </div>
      </button>

      {/* Recent Penalty Feed */}
      <section>
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">Live Activity</h4>
        <div className="space-y-3">
          {penalties.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-xs text-slate-600 font-medium">No penalties yet. Stay strong.</p>
            </div>
          ) : (
            penalties.map((p: any, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <Plus size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{p.name} was caught!</p>
                    <p className="text-[10px] text-slate-500">{p.date}</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-green-400">+$10.00</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-purple-500/30 flex flex-col">
      {/* View Content */}
      <div className="flex-1 overflow-y-auto pt-safe-top">
        {view === 'quest' && renderQuest()}
        {view === 'create' && renderCreateGoal()}
        {view === 'vault' && (
          <div className="p-6 text-center mt-20">
            <ShieldCheck size={48} className="mx-auto text-slate-800 mb-4" />
            <h2 className="text-xl font-bold">Vault is Locked</h2>
            <p className="text-slate-500 text-sm mt-2">Finish your first 30-day quest to unlock the resilience vault.</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-black/60 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center px-6 pb-safe">
        <button 
          onClick={() => setView('quest')}
          className={`flex flex-col items-center gap-1 group pb-2 transition-all ${view === 'quest' ? 'text-purple-500' : 'text-slate-600'}`}
        >
          <Target size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Quest</span>
        </button>
        
        <button 
          onClick={() => setView('vault')}
          className={`flex flex-col items-center gap-1 group pb-2 transition-all ${view === 'vault' ? 'text-white' : 'text-slate-600'}`}
        >
          <ShieldCheck size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Vault</span>
        </button>

        {/* Action Button: Context Aware */}
        <div className="relative -mt-12 group">
          <div className={`absolute -inset-2 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500 ${quest.role === 'supporter' || quest.checkedInDays.includes(new Date().toISOString().split('T')[0]) ? 'hidden' : 'animate-pulse'}`}></div>
          <button 
            id="check-in-main-btn"
            onClick={() => {
              if (quest.role === 'supporter') {
                setView('create');
              } else {
                handleCheckIn();
              }
            }}
            className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 border-[#050505] transition-all duration-300 transform active:scale-75 ${
              quest.role === 'supporter'
                ? 'bg-purple-600 text-white shadow-xl'
                : quest.checkedInDays.includes(new Date().toISOString().split('T')[0])
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'bg-white text-black shadow-xl shadow-white/10'
            }`}
          >
            {quest.role === 'supporter' ? (
              <>
                <Plus size={36} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase mt-0.5 tracking-widest">Create</span>
              </>
            ) : quest.checkedInDays.includes(new Date().toISOString().split('T')[0]) ? (
              <>
                <Check size={36} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase mt-0.5 tracking-widest">Done</span>
              </>
            ) : (
              <>
                <Plus size={36} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase mt-0.5 tracking-widest">Check</span>
              </>
            )}
          </button>
        </div>

        <button 
          onClick={() => setView('create')}
          className={`flex flex-col items-center gap-1 group pb-2 transition-all ${view === 'create' ? 'text-pink-500' : 'text-slate-600'}`}
        >
          <Zap size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">New</span>
        </button>
        
        <button className="flex flex-col items-center gap-1 group pb-2 text-slate-600">
          <User size={24} />
          <span className="text-[8px] font-bold uppercase tracking-tighter">Me</span>
        </button>
      </nav>

      {/* Temptation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#121214] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-3xl -z-10"></div>
             
             <h3 className="text-2xl font-black tracking-tight mb-2">Expose the Tempter</h3>
             <p className="text-slate-400 text-sm mb-8 leading-relaxed">
               Did someone try to break {quest.role === 'supporter' ? quest.targetUser : 'the'} streak? Enter their handle to request a <span className="text-red-400 font-bold">$10.00 penalty</span>.
             </p>

             <form onSubmit={(e) => {
               e.preventDefault();
               if (!tempter) return;
               setIsProcessing(true);
               setTimeout(() => {
                 setQuest(prev => ({ ...prev, bounty: prev.bounty + 10 }));
                 setPenalties(prev => [{ name: tempter, amount: 10, date: 'Just now' }, ...prev]);
                 setTempter('');
                 setIsProcessing(false);
                 setIsModalOpen(false);
               }, 800);
             }}>
               <div className="relative mb-6">
                 <input 
                  autoFocus
                  type="text" 
                  placeholder="@username or phone"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all text-white placeholder:text-slate-600"
                  value={tempter}
                  onChange={(e) => setTempter(e.target.value)}
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 italic text-xs">😈</div>
               </div>

               <button 
                type="submit"
                disabled={!tempter || isProcessing}
                className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 {isProcessing ? (
                   <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                 ) : (
                   <>
                    <Send size={18} />
                    SEND PENALTY REQUEST
                   </>
                 )}
               </button>

               <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-4 py-2 text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
               >
                 Cancel
               </button>
             </form>
          </div>
        </div>
      )}
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .pt-safe-top { padding-top: env(safe-area-inset-top); }
        .h-22 { height: 5.5rem; }
      `}</style>
    </div>
  );
};

export default App;
