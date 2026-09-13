'use client';

import { useDoc, useFirestore } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Youtube,
  FileText,
  BookOpen,
  Zap,
  Clock,
  Calendar,
  Edit3,
  Trash2,
  CheckCircle2,
  Link as LinkIcon,
  GraduationCap
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
  youtubeUrl?: string;
  mebiUrl?: string;
  ogmKonuUrl?: string;
  ogmTestUrl?: string;
  customLinkUrl?: string;
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
      <div className="mx-auto w-full max-w-[1700px] px-4 py-8 md:px-10 space-y-12">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="space-y-4">
            <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black italic leading-[0.85] tracking-tighter text-primary uppercase text-shadow-premium break-words">
              BUGÜNKÜ<br />BLOKLARIN
            </h2>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/20 italic ml-2">ACADEMIC ENGINE v46.0</p>
          </div>
          <Card className="bg-white rounded-[2.5rem] px-10 py-6 flex items-center gap-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] border-none shrink-0 w-full lg:w-auto relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
              <Calendar className="h-7 w-7 text-primary opacity-20" />
            </div>
            <div className="text-right flex-1 md:flex-none relative z-10">
              <p className="text-3xl font-black italic tracking-tighter text-primary leading-none">{format(new Date(), 'd MMMM', { locale: tr }).toUpperCase()}</p>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.4em] mt-2">{format(new Date(), 'yyyy')}</p>
            </div>
          </Card>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {currentDayPlan?.blocks?.map((block) => {
            const isDone = block.status === 'done';
            return (
              <Card 
                key={block.id}
                className={cn(
                  "aspect-square p-6 sm:p-8 rounded-[3rem] sm:rounded-[4rem] border-none transition-all hover:scale-[1.03] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.15)] group relative overflow-hidden bg-white h-full flex flex-col",
                  isDone && "opacity-60 grayscale-[0.4]"
                )}
              >
                <div className="space-y-6 sm:space-y-8 relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-[#FFF8E7] text-[#0F172A] flex items-center gap-1.5 sm:gap-2 border border-[#FEF3C7] shadow-sm">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                        <span className="text-[10px] sm:text-[12px] font-black">{block.time || '10:00'}</span>
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-black text-primary/15 uppercase tracking-[0.3em] italic">#SÖZEL</span>
                    </div>
                    <Badge 
                      onClick={() => handleTaskAction(block.id, 'done')}
                      className={cn(
                        "px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black shadow-lg border-none cursor-pointer active:scale-95 transition-all uppercase tracking-widest", 
                        isDone ? "bg-emerald-500 text-white" : "bg-[#FF4D6D] text-white hover:bg-[#FF4D6D]/90"
                      )}
                    >
                      {isDone ? 'TAMAM' : 'BEK'}
                    </Badge>
                  </div>

                  <div className="flex-1 flex items-center justify-center py-4 sm:py-6 overflow-hidden px-1">
                    <h4 className={cn("text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic leading-[1.05] tracking-tighter uppercase text-primary text-shadow-premium text-center break-words line-clamp-3", isDone && "text-primary/50 line-through decoration-2")}>
                      {block.topic}
                    </h4>
                  </div>

                  <div className="bg-[#F8FAFC]/90 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 space-y-4 sm:space-y-5 border border-slate-50 shadow-inner mt-auto">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] sm:text-[10px] font-black text-primary/30 uppercase tracking-[0.4em] italic">KONU ÇALIŞMA</span>
                        <div className="flex gap-3 sm:gap-4 items-center">
                           {block.youtubeUrl && <a href={block.youtubeUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" /></a>}
                           {block.mebiUrl && <a href={block.mebiUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" /></a>}
                           {block.ogmKonuUrl && <a href={block.ogmKonuUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" /></a>}
                        </div>
                      </div>
                    </div>
                    <div className="h-px w-full bg-slate-200/40" />
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                          <span className="text-[8px] sm:text-[10px] font-black text-accent uppercase tracking-[0.4em] italic">TEST ÇÖZME</span>
                        </div>
                        <div className="flex gap-3 sm:gap-4 items-center">
                           {block.ogmTestUrl && <a href={block.ogmTestUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" /></a>}
                           {block.customLinkUrl && <a href={block.customLinkUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><LinkIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /></a>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 mt-4">
                    <Button 
                      onClick={() => router.push('/dashboard/planning')} 
                      className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[#0F172A] text-white font-black uppercase text-[10px] sm:text-[11px] tracking-[0.3em] gap-2 sm:gap-3 shadow-2xl hover:bg-accent transition-all active:scale-95"
                    >
                      DÜZENLE <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                    </Button>
                    <Button 
                      onClick={() => handleTaskAction(block.id, 'delete')} 
                      variant="ghost" size="icon"
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-md"
                    >
                      <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {(!currentDayPlan || !currentDayPlan.blocks || currentDayPlan.blocks.length === 0) && (
            <Card onClick={() => router.push('/dashboard/planning')} className="xl:col-span-4 h-[300px] sm:h-[400px] text-center bg-white rounded-[3rem] sm:rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6 sm:gap-8 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all group w-full shadow-inner">
              <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-accent opacity-20 group-hover:scale-110 transition-transform" />
              <div className="space-y-2 sm:space-y-3 px-4">
                <p className="text-3xl sm:text-4xl font-black uppercase tracking-[0.3em] text-primary/10 italic">BUGÜN BOŞ</p>
                <p className="text-[10px] sm:text-[11px] font-bold text-primary/5 uppercase tracking-widest italic">AKADEMİK TERMİNALİ ÇALIŞTIRIN</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
