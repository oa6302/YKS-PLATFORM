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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, Suspense } from 'react';
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

const DEFAULT_PLAN_START = '2026-09-01';
const AYT_START_DATE = '2026-12-01';
const FINAL_EXAM_DATE = '2027-06-15';

export interface StudyBlock {
  id: string;
  lesson: string;
  topic: string;
  status: 'planned' | 'done' | 'skipped' | 'waiting';
  time: string;
  examType: 'TYT' | 'AYT' | 'GENEL';
  cardType: 'main_topic' | 'secondary_topic' | 'daily_review' | 'paragraph';
  youtubeUrl?: string;
  mebiUrl?: string;
  ogmKonuUrl?: string;
  ogmTestUrl?: string;
  customLinkUrl?: string;
  isManuallyEdited?: boolean;
}

export interface StudyDay {
  date: string;
  day: string;
  blocks: StudyBlock[];
}

export const generateAdaptivePlan = (
  startDateStr: string,
  completedTopics: Record<string, string[]> = {},
  existingPlan: StudyDay[] = []
): StudyDay[] => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO(AYT_START_DATE);
  const endDate = parseISO(FINAL_EXAM_DATE);
  const daysInterval = differenceInDays(endDate, startDate);

  if (daysInterval < 0) return [];

  const finishedSet = new Set(Object.values(completedTopics).flat());
  const lessonPointers: Record<string, number> = {};
  const plan: StudyDay[] = [];

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
    return 'GENEL SÖZEL ANALİZ';
  };

  for (let i = 0; i <= daysInterval; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayName = format(currentDate, 'EEEE', { locale: tr });
    const isAytStarted = !isBefore(currentDate, aytDate);
    
    // SIFIR VERİ KAYBI PROTOKOLÜ: Mevcut mühürlü günleri koru
    const existingDay = existingPlan.find(d => d.date === dateStr);
    if (existingDay && existingDay.blocks?.some(b => b.status === 'done' || b.isManuallyEdited || b.youtubeUrl || b.customLinkUrl)) {
      plan.push(existingDay);
      continue;
    }

    const tytLessons = Object.keys(TYT_SOZEL_TOPICS);
    const aytLessons = Object.keys(AYT_SOZEL_TOPICS);
    const dailyBlocks: StudyBlock[] = [];

    // 1. ANA KONU (10:00)
    const pool1 = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const lessons1 = Object.keys(pool1);
    const lesson1 = lessons1[i % lessons1.length];
    dailyBlocks.push({
      id: `block_${dateStr}_1000`,
      time: '10:00',
      lesson: lesson1,
      topic: getNextTopic(lesson1, pool1),
      status: 'waiting',
      examType: isAytStarted ? 'AYT' : 'TYT',
      cardType: 'main_topic'
    });

    // 2. İKİNCİ KONU (11:00)
    const lesson2 = tytLessons[(i + 1) % tytLessons.length];
    dailyBlocks.push({
      id: `block_${dateStr}_1100`,
      time: '11:00',
      lesson: lesson2,
      topic: getNextTopic(lesson2, TYT_SOZEL_TOPICS),
      status: 'waiting',
      examType: 'TYT',
      cardType: 'secondary_topic'
    });

    // 3. DÜNÜN TEKRARI (12:00)
    dailyBlocks.push({
      id: `block_${dateStr}_1200`,
      time: '12:00',
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      status: 'waiting',
      examType: 'GENEL',
      cardType: 'daily_review'
    });

    // 4. 20 ADET PARAGRAF (15:00)
    dailyBlocks.push({
      id: `block_${dateStr}_1500`,
      time: '15:00',
      lesson: 'TYT TÜRKÇE',
      topic: '20 ADET PARAGRAF KONDİSYONU',
      status: 'waiting',
      examType: 'TYT',
      cardType: 'paragraph'
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
            targetExam: 'YKS_TM_SOZEL',
            points: 1250,
            completedTopics: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        if (!planLoading && !studyPlan && userData && userData.role === 'student') {
          const adaptivePlan = generateAdaptivePlan(DEFAULT_PLAN_START, userData.completedTopics || {});
          await setDoc(doc(db, 'studyPlans', user.uid), {
            userId: user.uid,
            startDate: DEFAULT_PLAN_START,
            endDate: FINAL_EXAM_DATE,
            aytStartDate: AYT_START_DATE,
            masterPlan: adaptivePlan,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (error) { console.error(error); }
    };
    initProfile();
  }, [mounted, db, user, userData, studyPlan, docLoading, planLoading]);

  if (!mounted) return null;

  const navItems = [
    { id: 'dashboard', label: 'Anasayfa', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'planning', label: 'Akademik Terminal', icon: Calendar, path: '/dashboard/planning' },
    { id: 'topics', label: 'Konu Takibi', icon: BookOpen, path: '/dashboard/topics' },
    { id: 'test-analysis', label: 'Test Analizi', icon: BarChart3, path: '/dashboard/test-analysis' },
    { id: 'deneme-analysis', label: 'Deneme Analizi', icon: Trophy, path: '/dashboard/deneme-analysis' },
    { id: 'links', label: 'Kaynaklar', icon: LinkIcon, path: '/dashboard/links' },
    { id: 'awards', label: 'Ödüller', icon: Award, path: '/dashboard/awards' },
    { id: 'pomodoro', label: 'Pomodoro', icon: Clock, path: '/dashboard/pomodoro' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative overflow-hidden">
      <header className="md:hidden h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[60]">
        <div className="text-xl font-black italic tracking-tighter text-primary uppercase">DEK <span className="text-accent">AI</span></div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-xl h-12 w-12 bg-slate-50">
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn(`w-[280px] bg-white border-r border-slate-100 flex flex-col fixed md:sticky inset-y-0 left-0 z-[58] transition-transform duration-500 md:translate-x-0 h-screen`, sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        <div className="p-8 border-b border-slate-50 hidden md:block">
          <div className="text-2xl font-black italic tracking-tighter text-primary uppercase leading-none">DEK <span className="text-accent">AI</span></div>
        </div>
        <ScrollArea className="flex-1 p-6">
          <nav className="space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button key={item.id} onClick={() => { router.push(item.path); setSidebarOpen(false); }} className={cn(`w-full flex items-center gap-4 px-6 py-4 rounded-[1.25rem] transition-all font-black text-[11px] uppercase tracking-widest text-left group`, isActive ? `bg-[#0F172A] text-white shadow-[0_20px_40px_-10px_rgba(15,23,42,0.4)]` : `text-primary/40 hover:bg-slate-50 hover:text-primary`)}>
                  <Icon className={cn('h-5 w-5', isActive ? 'text-accent' : `text-slate-300 group-hover:text-primary`)} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
        {userData ? <StudentView user={user} userData={userData} /> : <div className="p-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto" /></div>}
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
