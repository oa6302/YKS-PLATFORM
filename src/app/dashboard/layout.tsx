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
  Sparkles,
  Brain,
  Compass,
  MessageSquare,
  Zap,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, ReactNode } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateAdaptivePlan } from './page'; // page.tsx'den import ediyoruz

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

  // Otonom Profil ve Plan Başlatıcı
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
  }, [db, user, userData, studyPlan, docLoading, planLoading]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'planning', label: 'Akademik Terminal', icon: Calendar, path: '/dashboard/planning' },
    { id: 'analysis', label: 'AI Analiz', icon: Brain, path: '/dashboard/ai-analysis' },
    { id: 'topics', label: 'Müfredat Radarı', icon: BookOpen, path: '/dashboard/topics' },
    { id: 'test-analysis', label: 'Data Lab', icon: BarChart3, path: '/dashboard/test-analysis' },
    { id: 'deneme-analysis', label: 'Şampiyonluk', icon: Trophy, path: '/dashboard/deneme-analysis' },
    { id: 'discover', label: 'Uzman Keşfet', icon: Compass, path: '/dashboard/discover' },
    { id: 'messages', label: 'Mesajlar', icon: MessageSquare, path: '/dashboard/messages' },
    { id: 'links', label: 'Akademik Kasa', icon: LinkIcon, path: '/dashboard/links' },
    { id: 'awards', label: 'Kupa Odası', icon: Award, path: '/dashboard/awards' },
    { id: 'pomodoro', label: 'Fokus Modu', icon: Clock, path: '/dashboard/pomodoro' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative overflow-hidden">
      {/* Sidebar V39 */}
      <aside className={cn(
        "w-[280px] bg-[#0F172A] text-white flex flex-col fixed md:sticky inset-y-0 left-0 z-[100] transition-transform duration-500 md:translate-x-0 h-screen shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
            DEK <span className="text-accent">AI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden text-white hover:bg-white/10">
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { router.push(item.path); setSidebarOpen(false); }} 
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all font-black text-[9px] uppercase tracking-widest text-left group relative overflow-hidden", 
                    isActive ? "bg-accent text-primary shadow-xl scale-[1.02]" : "text-white/40 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <Icon className={cn('h-4.5 w-4.5', isActive ? 'text-primary' : 'text-white/20 group-hover:text-accent transition-colors')} />
                    {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-primary relative z-10" />}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-6 border-t border-white/5">
           <div className="bg-white/5 rounded-2xl p-5 space-y-4 border border-white/5 relative overflow-hidden group/sys">
              <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover/sys:bg-accent/10 transition-all" />
              <div className="flex items-center gap-3 relative z-10">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] font-black uppercase tracking-widest text-white/40">SYSTEM ONLINE</span>
              </div>
              <p className="text-[10px] font-bold text-white/60 italic leading-relaxed relative z-10">YKS Sözel Master v63.0 terminale bağlı.</p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-[50] shrink-0">
          <div className="text-xl font-black italic tracking-tighter text-primary uppercase leading-none">
            DEK <span className="text-accent">AI</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl h-12 w-12 bg-slate-50 border border-slate-100 shadow-sm">
            <Menu className="h-6 w-6 text-primary" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
