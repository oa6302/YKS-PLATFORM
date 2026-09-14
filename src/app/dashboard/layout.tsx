
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
  Brain,
  Compass,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, ReactNode } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateAdaptivePlan } from './page';

const DEFAULT_PLAN_START = '2026-09-14';
const DEFAULT_PLAN_END = '2027-06-15';
const AYT_START_DATE = '2026-12-01';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const { data: userData, loading: docLoading } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  const { data: studyPlan, loading: planLoading } = useDoc<any>(user?.uid ? `studyPlans/${user.uid}` : null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!db || !user) return;
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
          const adaptivePlan = generateAdaptivePlan(DEFAULT_PLAN_START, DEFAULT_PLAN_END, userData.completedTopics || {});
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
  }, [db, user, userData, studyPlan, docLoading, planLoading]);

  const navItems = [
    { id: 'dashboard', label: 'ANA KONTROL', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'planning', label: 'AKADEMİK TERMİNAL', icon: Calendar, path: '/dashboard/planning' },
    { id: 'analysis', label: 'AI ANALİZ', icon: Brain, path: '/dashboard/ai-analysis' },
    { id: 'topics', label: 'MÜFREDAT RADARI', icon: BookOpen, path: '/dashboard/topics' },
    { id: 'test-analysis', label: 'VERİ ANALİZ LAB', icon: BarChart3, path: '/dashboard/test-analysis' },
    { id: 'deneme-analysis', label: 'ŞAMPİYONLUK', icon: Trophy, path: '/dashboard/deneme-analysis' },
    { id: 'discover', label: 'UZMAN KEŞFET', icon: Compass, path: '/dashboard/discover' },
    { id: 'messages', label: 'MESAJLAR', icon: MessageSquare, path: '/dashboard/messages' },
    { id: 'links', label: 'AKADEMİK KASA', icon: LinkIcon, path: '/dashboard/links' },
    { id: 'awards', label: 'KUPA ODASI', icon: Award, path: '/dashboard/awards' },
    { id: 'pomodoro', label: 'ODAK MODU', icon: Clock, path: '/dashboard/pomodoro' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative overflow-hidden">
      {/* Sidebar v67 */}
      <aside className={cn(
        "w-[300px] bg-[#0F172A] text-white flex flex-col fixed md:sticky inset-y-0 left-0 z-[100] transition-transform duration-500 md:translate-x-0 h-screen shadow-[10px_0_60px_rgba(0,0,0,0.3)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-10 pb-16 flex items-center justify-between">
          <div className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
            DEK <span className="text-accent">AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white hover:bg-white/10 p-2 rounded-xl">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <ScrollArea className="flex-1 px-6">
          <nav className="space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { router.push(item.path); setSidebarOpen(false); }} 
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-5 rounded-[1.5rem] transition-all font-black text-[10px] uppercase tracking-[0.2em] text-left group relative overflow-hidden", 
                    isActive ? "bg-accent text-primary shadow-2xl scale-[1.02]" : "text-white/30 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-white/20 group-hover:text-accent transition-colors')} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-primary relative z-10" />}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Status card removed per user request */}
        <div className="p-8 h-8" />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-50 shrink-0">
          <div className="text-xl font-black italic tracking-tighter text-primary uppercase leading-none">
            DEK <span className="text-accent">AI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl h-11 w-11 bg-slate-50 border border-slate-100 shadow-sm">
            <Menu className="h-5 w-5 text-primary" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
        </div>
      </div>
    </div>
  );
}
