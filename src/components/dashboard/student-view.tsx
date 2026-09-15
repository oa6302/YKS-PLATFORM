
'use client';

import { useDoc, useFirestore } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Youtube,
  Zap,
  Clock,
  Calendar,
  Edit3,
  Trash2,
  Link as LinkIcon,
  School,
  Globe,
  Library,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import {
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TaskLink {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'mebi' | 'eba' | 'ogm' | 'other';
}

interface StudentViewProps {
  user: any;
  userData: any;
}

interface StudyBlock {
  id: string;
  lesson: string;
  topic: string;
  status: 'planned' | 'done' | 'skipped' | 'waiting';
  time: string;
  examType?: string;
  links?: TaskLink[];
  startDate?: string;
  endDate?: string;
}

interface StudyDay {
  date: string;
  day: string;
  blocks: StudyBlock[];
}

interface StudyPlan {
  masterPlan?: StudyDay[];
}

export function StudentView({ user, userData }: StudentViewProps) {
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const { data: studyPlan, loading: planLoading } = useDoc<StudyPlan>(
    user?.uid ? `studyPlans/${user.uid}` : null
  );

  const currentDayPlan = useMemo(() => {
    if (!studyPlan?.masterPlan || !today) return null;
    return studyPlan.masterPlan.find((day) => day.date === today) || null;
  }, [studyPlan, today]);

  const handleTaskAction = async (blockId: string, action: 'done' | 'delete') => {
    if (!db || !user?.uid || !studyPlan?.masterPlan || !today) return;

    try {
      const newPlan = studyPlan.masterPlan.map((day) => {
        if (day.date !== today) return day;
        const newBlocks = day.blocks.map((block) => {
          if (block.id !== blockId) return block;
          if (action === 'done') {
            return { ...block, status: block.status === 'done' ? 'planned' : 'done' };
          }
          return null;
        }).filter((block): block is StudyBlock => block !== null);
        return { ...day, blocks: newBlocks };
      });

      await updateDoc(doc(db, 'studyPlans', user.uid), {
        masterPlan: newPlan,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: action === 'done' ? 'Terminal Mühürlendi' : 'Görev Silindi',
        className: 'bg-primary text-white rounded-2xl shadow-2xl',
      });
    } catch (error) {
      toast({ title: 'Hata', variant: 'destructive' });
    }
  };

  const getLinkIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Youtube className="h-4 w-4 text-rose-600" />;
      case 'mebi': return <School className="h-4 w-4 text-orange-500" />;
      case 'eba': return <Globe className="h-4 w-4 text-blue-500" />;
      case 'ogm': return <Library className="h-4 w-4 text-emerald-500" />;
      default: return <LinkIcon className="h-4 w-4 text-primary" />;
    }
  };

  if (planLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 p-10">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary/40">Terminal Senkronize Ediliyor...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC]">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-12 space-y-16">
        <header className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest italic border border-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> AKADEMİK KOMUTA v71.0
            </div>
            <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter text-primary uppercase leading-[0.9]">
              Bugünkü <br /><span className="text-accent">Blokların</span>
            </h2>
          </div>
          
          <Card className="bg-white rounded-[2.5rem] px-10 py-8 flex items-center gap-8 shadow-xl border-none shrink-0 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
              <Calendar className="h-8 w-8 text-primary/20" />
            </div>
            <div className="text-right relative z-10">
              <p className="text-4xl font-black italic tracking-tighter text-primary leading-none">
                {format(new Date(), 'd MMMM', { locale: tr }).toUpperCase()}
              </p>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.4em] mt-2">{format(new Date(), 'yyyy')}</p>
            </div>
          </Card>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10">
          {currentDayPlan?.blocks?.map((block) => {
            const isDone = block.status === 'done';
            return (
              <Card 
                key={block.id}
                className={cn(
                  "min-h-[550px] p-10 rounded-[3.5rem] border-none transition-all duration-500 hover:-translate-y-3 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.1)] group bg-white flex flex-col justify-between",
                  isDone && "opacity-60 grayscale-[0.5]"
                )}
              >
                <div className="space-y-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="px-5 py-2.5 rounded-xl bg-slate-50 text-primary/40 text-[10px] font-black italic border border-slate-100">{block.time}</div>
                       <span className="text-[9px] font-black text-accent uppercase tracking-widest italic">#{block.examType || 'TYT'}</span>
                    </div>
                    <button 
                      onClick={() => handleTaskAction(block.id, 'done')}
                      className={cn(
                        "h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all",
                        isDone ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-accent"
                      )}
                    >
                      {isDone ? 'TAMAMLANDI' : 'MÜHÜRLE'}
                    </button>
                  </div>

                  <div className="space-y-4 text-center sm:text-left">
                    <h4 className={cn(
                      "text-4xl font-black italic tracking-tighter text-primary uppercase leading-[0.95] line-clamp-3 min-h-[110px]",
                      isDone && "line-through opacity-30"
                    )}>
                      {block.topic}
                    </h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-40">{block.lesson}</p>
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-4 shadow-inner border border-white max-h-[220px] overflow-y-auto scrollbar-hide">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[9px] font-black text-primary/30 uppercase tracking-[0.4em] italic">KAYNAKLAR</span>
                         <Zap className="h-4 w-4 text-accent animate-pulse" />
                      </div>
                      
                      <div className="grid gap-2">
                         {block.links?.map((link: TaskLink) => (
                           <a key={link.id} href={link.url} target="_blank" className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-slate-50 hover:border-accent transition-all group/link">
                              <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                 {getLinkIcon(link.type)}
                              </div>
                              <span className="text-[10px] font-black text-primary/60 truncate uppercase">{link.title}</span>
                              <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover/link:opacity-100 transition-opacity" />
                           </a>
                         ))}
                         {(!block.links || block.links.length === 0) && (
                           <p className="text-[9px] text-center italic opacity-20 py-4 uppercase font-black">Link Yok</p>
                         )}
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <Button 
                        onClick={() => router.push('/dashboard/planning')} 
                        className="flex-1 h-14 rounded-2xl bg-[#0F172A] hover:bg-accent text-white font-black text-[10px] uppercase tracking-widest gap-3 shadow-xl transition-all"
                      >
                         EDİTÖRÜ AÇ <ChevronRight className="h-4 w-4 text-accent" />
                      </Button>
                      <Button 
                        onClick={() => handleTaskAction(block.id, 'delete')}
                        variant="ghost" 
                        size="icon" 
                        className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 hover:bg-destructive hover:text-white transition-all shadow-sm"
                      >
                         <Trash2 className="h-5 w-5" />
                      </Button>
                   </div>
                </div>
              </Card>
            );
          })}

          {(!currentDayPlan || !currentDayPlan.blocks || currentDayPlan.blocks.length === 0) && (
            <Card 
              onClick={() => router.push('/dashboard/planning')}
              className="xl:col-span-4 h-[450px] rounded-[4rem] border-4 border-dashed border-slate-100 bg-white flex flex-col items-center justify-center gap-8 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group w-full"
            >
               <Zap className="h-16 w-16 text-slate-100 group-hover:text-accent transition-colors" strokeWidth={3} />
               <div className="text-center space-y-3">
                  <p className="text-4xl font-black uppercase tracking-[0.3em] text-slate-100 group-hover:text-primary transition-colors italic">Sistem Boşta</p>
                  <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest italic">TERMİNALİ ÇALIŞTIRMAK İÇİN DOKUNUN</p>
               </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
