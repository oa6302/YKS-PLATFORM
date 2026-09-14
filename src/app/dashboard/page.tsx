
'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  BarChart3,
  Trophy,
  Link as LinkIcon,
  Award,
  Clock,
  Menu,
  X,
  Loader2,
  Sparkles,
  Zap,
  Target,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { StudentView } from '@/components/dashboard/student-view';
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  format,
  addDays,
  differenceInDays,
  parseISO,
  isBefore,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { TYT_SOZEL_TOPICS, AYT_SOZEL_TOPICS } from '@/lib/curriculum-data';

const DEFAULT_PLAN_START = '2026-09-14';
const DEFAULT_PLAN_END = '2027-06-15';
const AYT_START_DATE = '2026-12-01';

/**
 * MASTER ADAPTIVE PLANNER v60.0
 * Yıllık, aylık, haftalık ve günlük hiyerarşiyi içeren otonom motor.
 */
export const generateAdaptivePlan = (
  startDateStr: string,
  endDateStr: string,
  completedTopics: Record<string, string[]> = {},
  existingPlan: any[] = []
): any[] => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO(AYT_START_DATE);
  const endDate = parseISO(endDateStr);
  const daysInterval = differenceInDays(endDate, startDate);

  if (daysInterval < 0) return [];

  const finishedSet = new Set(Object.values(completedTopics).flat());
  const lessonPointers: Record<string, number> = {};
  const plan: any[] = [];

  const getNextTopic = (lesson: string, pool: Record<string, string[]>) => {
    const allTopics = pool[lesson] || [];
    let pointer = lessonPointers[lesson] || 0;
    let attempts = 0;

    while (attempts < allTopics.length) {
      const currentTopic = allTopics[pointer % allTopics.length];
      if (!finishedSet.has(currentTopic)) {
        lessonPointers[lesson] = pointer + 1;
        return currentTopic;
      }
      pointer++;
      attempts++;
    }
    return 'GENEL ANALİZ';
  };

  for (let i = 0; i <= daysInterval; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayName = format(currentDate, 'EEEE', { locale: tr });
    const isAytStarted = !isBefore(currentDate, aytDate);
    
    const existingDay = existingPlan.find(d => d.date === dateStr);
    // Zero-Loss: Dokunulmuş blokları koru
    if (existingDay && existingDay.blocks?.some((b: any) => b.status === 'done' || b.isManuallyEdited || b.youtubeUrl || b.customLinkUrl)) {
      plan.push(existingDay);
      continue;
    }

    const tytLessons = Object.keys(TYT_SOZEL_TOPICS);
    const dailyBlocks: any[] = [];

    // 10:00 - Ana Akademik Blok
    const pool1 = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const lessons1 = Object.keys(pool1);
    const lesson1 = lessons1[i % lessons1.length];
    dailyBlocks.push({
      id: `block_${dateStr}_1000`,
      time: '10:00',
      lesson: lesson1,
      topic: getNextTopic(lesson1, pool1),
      status: 'waiting',
      examType: isAytStarted ? 'AYT' : 'TYT'
    });

    // 11:00 - Destekleyici Blok
    const lesson2 = tytLessons[(i + 1) % tytLessons.length];
    dailyBlocks.push({
      id: `block_${dateStr}_1100`,
      time: '11:00',
      lesson: lesson2,
      topic: getNextTopic(lesson2, TYT_SOZEL_TOPICS),
      status: 'waiting',
      examType: 'TYT'
    });

    // 12:00 - Stratejik Tekrar
    dailyBlocks.push({
      id: `block_${dateStr}_1200`,
      time: '12:00',
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      status: 'waiting',
      examType: 'GENEL'
    });

    // 15:00 - Paragraf
    dailyBlocks.push({
      id: `block_${dateStr}_1500`,
      time: '15:00',
      lesson: 'TYT TÜRKÇE',
      topic: '20 ADET PARAGRAF KONDİSYONU',
      status: 'waiting',
      examType: 'TYT'
    });

    plan.push({ date: dateStr, day: dayName, blocks: dailyBlocks });
  }

  return plan;
};

function DashboardContent() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const { data: userData, loading: docLoading } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  const { data: studyPlan, loading: planLoading } = useDoc<any>(user?.uid ? `studyPlans/${user.uid}` : null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !db || !user) return;
    const initProfile = async () => {
      try {
        if (!docLoading && !userData) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: 'Misafir Öğrenci',
            role: 'student',
            targetExam: 'YKS_SOZEL_2027',
            points: 1250,
            completedTopics: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        if (!planLoading && !studyPlan && userData && userData.role === 'student') {
          const adaptivePlan = generateAdaptivePlan(DEFAULT_PLAN_START, DEFAULT_PLAN_END, userData.completedTopics || []);
          await setDoc(doc(db, 'studyPlans', user.uid), {
            userId: user.uid,
            startDate: DEFAULT_PLAN_START,
            endDate: DEFAULT_PLAN_END,
            aytStartDate: AYT_START_DATE,
            masterPlan: adaptivePlan,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (error) { console.error(error); }
    };
    initProfile();
  }, [mounted, db, user, userData, studyPlan, docLoading, planLoading]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'planning', label: 'Akademik Terminal', icon: Calendar, path: '/dashboard/planning' },
    { id: 'topics', label: 'Müfredat Radarı', icon: BookOpen, path: '/dashboard/topics' },
    { id: 'test-analysis', label: 'Data Lab', icon: BarChart3, path: '/dashboard/test-analysis' },
    { id: 'deneme-analysis', label: 'Şampiyonluk', icon: Trophy, path: '/dashboard/deneme-analysis' },
    { id: 'links', label: 'Akademik Kasa', icon: LinkIcon, path: '/dashboard/links' },
    { id: 'awards', label: 'Kupa Odası', icon: Award, path: '/dashboard/awards' },
    { id: 'pomodoro', label: 'Fokus Modu', icon: Clock, path: '/dashboard/pomodoro' },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative">
      {/* Sidebar V39 */}
      <aside className={cn(
        "w-[280px] bg-[#0F172A] text-white flex flex-col fixed md:sticky inset-y-0 left-0 z-[100] transition-transform duration-500 md:translate-x-0 h-screen",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
            DEK <span className="text-accent">AI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden text-white">
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { router.push(item.path); setSidebarOpen(false); }} 
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest text-left group", 
                    isActive ? "bg-accent text-primary shadow-2xl scale-[1.02]" : "text-white/40 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-white/20 group-hover:text-accent')} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-6 border-t border-white/5">
           <div className="bg-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-white/40">SYSTEM ONLINE</span>
              </div>
              <p className="text-[10px] font-bold text-white/60 italic leading-relaxed">YKS Sözel Master v60.0 terminale bağlı.</p>
           </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 relative">
        {/* Mobile Header */}
        <header className="md:hidden h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[50]">
          <div className="text-xl font-black italic tracking-tighter text-primary uppercase">DEK <span className="text-accent">AI</span></div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl h-12 w-12 bg-slate-50">
            <Menu className="h-6 w-6 text-primary" />
          </Button>
        </header>

        <ScrollArea className="h-full">
           {userData ? <StudentView user={user} userData={userData} /> : (
             <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin h-10 w-10 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Veriler Yükleniyor</span>
             </div>
           )}
        </ScrollArea>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="h-10 w-10 animate-spin text-accent" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
