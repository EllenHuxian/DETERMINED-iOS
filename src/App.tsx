
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
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
  DollarSign,
  LogOut,
} from 'lucide-react';

type View = 'quest' | 'create' | 'vault';
type AuthMode = 'login' | 'signup';

interface DbQuest {
  id: string;
  owner_id: string;
  habit_name: string;
  target_days: number;
  bounty: number;
  status: string;
  created_at: string;
}

interface DbPenalty {
  id: string;
  quest_id: string;
  tempter_handle: string;
  amount: number;
  created_at: string;
}

const App = () => {
  // ─── Auth State ───────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');

  // ─── App State ────────────────────────────────────────────────
  const [view, setView] = useState<View>('quest');
  const [quest, setQuest] = useState<DbQuest | null>(null);
  const [checkedInDays, setCheckedInDays] = useState<string[]>([]);
  const [penalties, setPenalties] = useState<DbPenalty[]>([]);
  const [dayCount, setDayCount] = useState(0);

  // ─── Create Form State ────────────────────────────────────────
  const [newGoalName, setNewGoalName] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [newBounty, setNewBounty] = useState(100);

  // ─── UI State ─────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempter, setTempter] = useState('');
  const [tempterEmail, setTempterEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Derived Values ───────────────────────────────────────────
  const progressPercentage = quest ? dayCount / quest.target_days : 0;
  const securedAmount = quest ? (quest.bounty * progressPercentage).toFixed(2) : '0.00';
  const todayStr = new Date().toISOString().split('T')[0];
  const checkedInToday = checkedInDays.includes(todayStr);

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

  // ─── Auth Effects ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchActiveQuest(session.user.id);
    } else {
      setQuest(null);
      setCheckedInDays([]);
      setPenalties([]);
      setDayCount(0);
    }
  }, [session]);

  // ─── Data Fetching ────────────────────────────────────────────
  const fetchActiveQuest = async (userId: string) => {
    const { data } = await supabase
      .from('quests')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setQuest(data);
      await Promise.all([fetchCheckIns(data.id), fetchPenalties(data.id)]);
    }
  };

  const fetchCheckIns = async (questId: string) => {
    const { data } = await supabase
      .from('check_ins')
      .select('checked_in_date')
      .eq('quest_id', questId);

    if (data) {
      const dates = data.map(r => r.checked_in_date as string);
      setCheckedInDays(dates);
      setDayCount(dates.length);
    }
  };

  const fetchPenalties = async (questId: string) => {
    const { data } = await supabase
      .from('penalties')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false });

    if (data) setPenalties(data);
  };

  // ─── Auth Handlers ────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsProcessing(true);

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setAuthError(error.message);
      setIsProcessing(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: authUsername || authEmail.split('@')[0],
      });
      if (profileError) setAuthError('Account created but profile setup failed. Try signing in.');
    }

    setIsProcessing(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsProcessing(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (error) setAuthError(error.message);
    setIsProcessing(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('quest');
  };

  // ─── Quest Handlers ───────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!quest || !session?.user || checkedInToday) return;

    const { error } = await supabase.from('check_ins').insert({
      quest_id: quest.id,
      user_id: session.user.id,
      checked_in_date: todayStr,
    });

    if (!error) {
      setCheckedInDays(prev => [...prev, todayStr]);
      setDayCount(prev => prev + 1);
      const btn = document.getElementById('check-in-main-btn');
      btn?.classList.add('scale-90');
      setTimeout(() => btn?.classList.remove('scale-90'), 150);
    }
  };

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setIsProcessing(true);

    const { data, error } = await supabase
      .from('quests')
      .insert({
        owner_id: session.user.id,
        habit_name: newGoalName,
        target_days: newDuration,
        bounty: newBounty,
        status: 'active',
      })
      .select()
      .single();

    if (!error && data) {
      setQuest(data);
      setCheckedInDays([]);
      setPenalties([]);
      setDayCount(0);
      setNewGoalName('');
      setNewDuration(30);
      setNewBounty(100);
      setView('quest');
    }

    setIsProcessing(false);
  };

  const handlePenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quest || !tempter || !tempterEmail) return;
    setIsProcessing(true);

    const newBountyAmount = quest.bounty + 10;

    const { data: penaltyData, error } = await supabase
      .from('penalties')
      .insert({ quest_id: quest.id, tempter_handle: tempter, tempter_email: tempterEmail, amount: 10 })
      .select()
      .single();

    if (!error && penaltyData) {
      await supabase.from('quests').update({ bounty: newBountyAmount }).eq('id', quest.id);
      setPenalties(prev => [penaltyData, ...prev]);
      setQuest(prev => prev ? { ...prev, bounty: newBountyAmount } : prev);

      // Send penalty notification email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-penalty-email', {
        body: {
          tempterName: tempter,
          tempterEmail: tempterEmail,
          habitName: quest.habit_name,
          amount: 10,
        },
      });
      if (emailError) console.error('Email send failed:', emailError, await emailError.context?.json?.());
    }

    setTempter('');
    setTempterEmail('');
    setIsProcessing(false);
    setIsModalOpen(false);
  };

  // ─── Render: Auth Screen ──────────────────────────────────────
  const renderAuth = () => (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mx-auto mb-4">
            <Trophy className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            DETERMINED
          </h1>
          <p className="text-slate-500 text-sm mt-2">Talk is cheap. Show your commitment.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 mb-8">
          <button
            onClick={() => { setAuthMode('login'); setAuthError(''); }}
            className={`py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setAuthMode('signup'); setAuthError(''); }}
            className={`py-3 rounded-xl font-bold text-sm transition-all ${authMode === 'signup' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={authMode === 'login' ? handleSignIn : handleSignUp} className="space-y-4">
          {authMode === 'signup' && (
            <input
              type="text"
              placeholder="Username"
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-purple-500/50 transition-all text-white placeholder:text-slate-600"
              value={authUsername}
              onChange={e => setAuthUsername(e.target.value)}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-purple-500/50 transition-all text-white placeholder:text-slate-600"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            required
            minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-purple-500/50 transition-all text-white placeholder:text-slate-600"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
          />

          {authError && (
            <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 py-5 rounded-2xl font-black italic uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 disabled:opacity-50 active:scale-95 transition-all"
          >
            {isProcessing ? 'LOADING...' : authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  );

  // ─── Render: No Quest State ───────────────────────────────────
  const renderNoQuest = () => (
    <div className="max-w-md mx-auto p-6 mt-20 text-center">
      <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Trophy size={40} className="text-slate-700" />
      </div>
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-3">No Active Quest</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-8">
        You haven't started a quest yet. Set a goal, stake your bounty, and prove your determination.
      </p>
      <button
        onClick={() => setView('create')}
        className="bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-5 rounded-2xl font-black italic uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
      >
        CREATE YOUR FIRST QUEST
      </button>
    </div>
  );

  // ─── Render: Create Goal ──────────────────────────────────────
  const renderCreateGoal = () => (
    <div className="max-w-md mx-auto p-6 animate-in slide-in-from-bottom-10 duration-500">
      <button onClick={() => setView('quest')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
        <ChevronLeft size={20} />
        <span className="text-xs font-bold uppercase tracking-widest">Back</span>
      </button>

      <h1 className="text-4xl font-black tracking-tighter italic uppercase mb-2">New Quest</h1>
      <p className="text-slate-400 text-sm mb-8">Talk is cheap. Show your commitment.</p>

      <form onSubmit={handleCreateQuest} className="space-y-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">The Goal</label>
          <input
            required
            type="text"
            placeholder="e.g. No Sugar, 6AM Gym, Code daily"
            className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 outline-none transition-all text-white placeholder:text-slate-700"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Duration (Days)</label>
            <div className="relative">
              <input
                required
                type="number"
                min={1}
                className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 outline-none text-white"
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
                min={1}
                className="w-full bg-[#0f0f12] border border-white/10 rounded-2xl p-6 text-xl font-bold focus:border-purple-500/50 outline-none text-white"
                value={newBounty}
                onChange={(e) => setNewBounty(parseInt(e.target.value))}
              />
              <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
            </div>
          </div>
        </div>

        <button
          disabled={isProcessing}
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 py-6 rounded-2xl font-black italic uppercase tracking-widest text-white shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {isProcessing ? 'CREATING QUEST...' : 'START COMMITMENT'}
        </button>
      </form>
    </div>
  );

  // ─── Render: Quest ────────────────────────────────────────────
  const renderQuest = () => {
    if (!quest) return renderNoQuest();

    const questStartDate = quest.created_at.split('T')[0];

    return (
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
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-all"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Main Bounty Display */}
        <section className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-[#0f0f12] border border-white/10 rounded-[2rem] p-8 overflow-hidden">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
                YOUR GOAL: {quest.habit_name.toUpperCase()}
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
          </div>
        </section>

        {/* Challenge Progress */}
        <section className="mb-6 p-6 bg-white/5 border border-white/10 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} />
          </div>

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h2 className="text-lg font-bold">{quest.habit_name}</h2>
            </div>
            <div className="text-right">
              <span className="text-orange-500 flex items-center gap-1 text-sm font-black italic">
                <Flame size={16} fill="currentColor" /> Day {dayCount} of {quest.target_days}
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
                  {dayCount === 0 ? 'Starting Quest' : 'Partial Payout Secured'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">At Risk</p>
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
              const isChecked = checkedInDays.includes(d.dateStr);
              const isMissed = !isChecked && !d.isToday && d.dateStr >= questStartDate && d.dateStr < todayStr;

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

        {/* Temptation Button */}
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
                <h3 className="font-bold text-red-100 uppercase tracking-tight text-sm">Someone Tempted Me</h3>
                <p className="text-xs text-red-300/60">Tap to charge them $10.00</p>
              </div>
            </div>
            <ChevronRight className="text-red-500/50" />
          </div>
        </button>

        {/* Penalty Feed */}
        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">Live Activity</h4>
          <div className="space-y-3">
            {penalties.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-xs text-slate-600 font-medium">No penalties yet. Stay strong.</p>
              </div>
            ) : (
              penalties.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 animate-in slide-in-from-right-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                      <AlertCircle size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">@{p.tempter_handle} was caught!</p>
                      <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-green-400">+${p.amount}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  };

  // ─── Loading Spinner ──────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Auth Gate ────────────────────────────────────────────────
  if (!session) return renderAuth();

  // ─── Main App ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-purple-500/30 flex flex-col">
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

        {/* Center Action Button */}
        <div className="relative -mt-12 group">
          <div className={`absolute -inset-2 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500 ${checkedInToday || !quest ? 'hidden' : 'animate-pulse'}`}></div>
          <button
            id="check-in-main-btn"
            onClick={() => quest ? handleCheckIn() : setView('create')}
            className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 border-[#050505] transition-all duration-300 transform active:scale-75 ${
              !quest
                ? 'bg-purple-600 text-white shadow-xl'
                : checkedInToday
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'bg-white text-black shadow-xl shadow-white/10'
            }`}
          >
            {!quest ? (
              <>
                <Plus size={36} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase mt-0.5 tracking-widest">Create</span>
              </>
            ) : checkedInToday ? (
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

        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 group pb-2 text-slate-600 hover:text-white transition-colors"
        >
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
              Did someone try to break your streak? Enter their details and they'll receive a <span className="text-red-400 font-bold">$10.00 penalty</span> notification by email.
            </p>

            <form onSubmit={handlePenalty}>
              <div className="space-y-3 mb-6">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Their name"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all text-white placeholder:text-slate-600"
                    value={tempter}
                    onChange={(e) => setTempter(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs">😈</div>
                </div>
                <input
                  type="email"
                  placeholder="Their email address"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all text-white placeholder:text-slate-600"
                  value={tempterEmail}
                  onChange={(e) => setTempterEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={!tempter || !tempterEmail || isProcessing}
                className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={18} />
                    LOG PENALTY
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .pt-safe-top { padding-top: env(safe-area-inset-top); }
        .h-22 { height: 5.5rem; }
      `}</style>
    </div>
  );
};

export default App;
