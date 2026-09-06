'use client';

import { useUser, useDoc, useFirestore } from '@/firebase';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  Brain,
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
  studyResources: any[];
  testResources: any[];
}

export interface StudyDay {
  date: string;
  day: string;
  blocks: StudyBlock[];
}

export const generateAdaptivePlan = (
  startDateStr: string,
  completedTopics: Record<string, string[]> = {}
): StudyDay[] => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO(AYT_START_DATE);
  const endDate = parseISO(FINAL_EXAM_DATE);
  const daysInterval = differenceInDays(endDate, startDate);

  if (daysInterval < 0) return [];

  const lessonPointers: Record<string, number> = {};
  const plan: StudyDay[] = [];

  for (let i = 0; i <= daysInterval; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayName = format(currentDate, 'EEEE', { locale: tr });
    const isAytStarted = !isBefore(currentDate, aytDate);
    
    const tytLessons = Object.keys(TYT_SOZEL_TOPICS);
    const aytLessons = Object.keys(AYT_SOZEL_TOPICS);
    const dailyBlocks: StudyBlock[] = [];

    // 1. KART - ANA KONU (10:00)
    const lesson1 = tytLessons[i % tytLessons.length];
    const topics1 = TYT_SOZEL_TOPICS[lesson1];
    const topic1 = topics1[(lessonPointers[lesson1] || 0) % topics1.length];
    lessonPointers[lesson1] = (lessonPointers[lesson1] || 0) + 1;

    dailyBlocks.push({
      id: `block_${dateStr}_1000`,
      time: '10:00',
      lesson: lesson1,
      topic: topic1,
      status: 'waiting',
      examType: 'TYT',
      cardType: 'main_topic',
      studyResources: [{ type: 'youtube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(lesson1 + ' ' + topic1)}` }],
      testResources: [{ type: 'eba', url: `https://www.eba.gov.tr/arama?q=${encodeURIComponent(topic1)}` }]
    });

    // 2. KART - İKİNCİ KONU (11:00)
    const pool2 = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const lessons2 = Object.keys(pool2);
    const lesson2 = lessons2[(i + 1) % lessons2.length];
    const topic2 = pool2[lesson2][(lessonPointers[lesson2] || 0) % pool2[lesson2].length];
    lessonPointers[lesson2] = (lessonPointers[lesson2] || 0) + 1;

    dailyBlocks.push({
      id: `block_${dateStr}_1100`,
      time: '11:00',
      lesson: lesson2,
      topic: topic2,
      status: 'waiting',
      examType: isAytStarted ? 'AYT' : 'TYT',
      cardType: 'secondary_topic',
      studyResources: [{ type: 'youtube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(lesson2 + ' ' + topic2)}` }],
      testResources: [{ type: 'ogm', url: `https://ogmmateryal.eba.gov.tr/arama?q=${encodeURIComponent(topic2)}` }]
    });

    // 3. KART - DÜNÜN TEKRARI (12:00)
    dailyBlocks.push({
      id: `block_${dateStr}_1200`,
      time: '12:00',
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN TEKRARI',
      status: 'waiting',
      examType: 'GENEL',
      cardType: 'daily_review',
      studyResources: [],
      testResources: []
    });

    // 4. KART - 20 ADET PARAGRAF (15:00)
    dailyBlocks.push({
      id: `block_${dateStr}_1500`,
      time: '15:00',
      lesson: 'TYT TÜRKÇE',
      topic: '20 ADET PARAGRAF',
      status: 'waiting',
      examType: 'TYT',
      cardType: 'paragraph',
      studyResources: [{ type: 'youtube', url: 'https://www.youtube.com/results?search_query=paragraf+taktikleri' }],
      testResources: [{ type: 'eba', url: 'https://www.eba.gov.tr/arama?q=paragraf+testi' }]
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
  const searchParams = useSearchParams();
  const simulateUid = searchParams.get('simulate');
  const targetUid = simulateUid || user?.uid;

  const { data: userData, loading: docLoading } = useDoc<any>(targetUid ? `users/${targetUid}` : null);
  const { data: studyPlan, loading: planLoading } = useDoc<any>(targetUid ? `studyPlans/${targetUid}` : null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !db || !user || simulateUid) return;
    const initProfile = async () => {
      try {
        if (!docLoading && !userData) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: 'Misafir Öğrenci',
            role: 'student',
            targetExam: 'YKS_SOZEL',
            points: 1250,
            completedTopics: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        if (!planLoading && !studyPlan && userData) {
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
  }, [mounted, db, user, simulateUid, userData, studyPlan, docLoading, planLoading]);

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
    { id: 'ai-assistant', label: 'AI Asistan', icon: Brain, path: '/dashboard/ai-analysis' },
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
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <StudentView user={user} userData={userData || { role: 'student', targetExam: 'YKS_SOZEL' }} />
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
