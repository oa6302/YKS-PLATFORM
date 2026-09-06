
'use client';

import { useDoc, useFirestore } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, Loader2, Youtube, FileText, 
  BookOpen, Zap, Clock, Calendar, Edit3, Trash2,
  Link as LinkIcon
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function StudentView({ user, userData }: { user: any, userData: any }) {
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [today, setToday] = useState('');
  useEffect(() => { setToday(format(new Date(), 'yyyy-MM-dd')); }, []);

  const { data: studyPlan, loading: planLoading } = useDoc<any>(user?.uid ? `studyPlans/${user.uid}` : null);
  
  const currentDayPlan = useMemo(() => {
    if (!studyPlan?.masterPlan || !today) return null;
    return studyPlan.masterPlan.find((d: any) => d.date === today);
  }, [studyPlan, today]);

  const handleTaskAction = async (blockId: string, action: 'done' | 'delete') => {
    if (!db || !user?.uid || !studyPlan?.masterPlan || !today) return;
    
    const newPlan = studyPlan.masterPlan.map((day: any) => {
      if (day.date === today) {
        return { 
          ...day, 
          blocks: day.blocks.map((b: any) => {
            if (b.id === blockId) {
              if (action === 'done') return { ...b, status: (b.status === 'done' || b.status === 'completed') ? 'waiting' : 'done' };
              if (action === 'delete') return null;
            }
            return b;
          }).filter(Boolean)
        };
      }
      return day;
    });
    
    try {
      await updateDoc(doc(db, 'studyPlans', user.uid), { masterPlan: newPlan, updatedAt: serverTimestamp() });
      toast({ 
        title: action === 'done' ? 'Terminal Güncellendi' : 'Görev İptal Edildi', 
        className: "bg-primary text-white rounded-2xl shadow-2xl" 
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata oluştu' });
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Youtube className="h-4 w-4 text-rose-500" />;
      case 'eba': return <BookOpen className="h-4 w-4 text-emerald-500" />;
      case 'ogm': return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'pdf': return <FileText className="h-4 w-4 text-orange-500" />;
      case 'lesson_link': return <LinkIcon className="h-4 w-4 text-primary" />;
      default: return <LinkIcon className="h-4 w-4 text-primary" />;
    }
  };

  if (planLoading) return (
    <div className="p-20 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 italic">Terminal Senkronize Ediliyor...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-[1700px] mx-auto w-full animate-in fade-in duration-1000 bg-[#F8FAFC]">
      <section className="space-y-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 px-2">
           <div className="space-y-2 text-center lg:text-left overflow-hidden">
              <h2 className="text-6xl md:text-8xl lg:text-[10rem] font-black italic leading-[0.8] tracking-tighter text-primary uppercase text-shadow-premium break-words">
                 BUGÜNKÜ<br />BLOKLARIN
              </h2>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/20 italic ml-2">VERBAL ENGINE v41.0</p>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
             {currentDayPlan?.blocks?.map((block: any) => {
                const isDone = block.status === 'done' || block.status === 'completed';
                return (
                  <Card 
                    key={block.id} 
                    className={cn(
                      "aspect-square p-8 rounded-[4rem] border-none transition-all hover:scale-[1.03] shadow-[0_50px_100px_-25px_rgba(15,23,42,0.15)] group relative overflow-hidden bg-white h-full flex flex-col",
                      isDone && "opacity-60 grayscale-[0.4]"
                    )}
                  >
                     <div className="space-y-8 relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <div className="px-4 py-2 rounded-2xl bg-[#FFF8E7] text-[#0F172A] flex items-center gap-2 border border-[#FEF3C7] shadow-sm">
                                  <Clock className="h-4 w-4 text-accent" />
                                  <span className="text-[12px] font-black">{block.time || '10:00'}</span>
                                </div>
                                <span className="text-[10px] font-black text-primary/15 uppercase tracking-[0.3em] italic">#{block.examType || (String(block.lesson).includes('AYT') ? 'AYT' : 'TYT')}</span>
                             </div>
                             <Badge 
                               onClick={() => handleTaskAction(block.id, 'done')}
                               className={cn(
                                 "px-5 py-2 rounded-xl text-[10px] font-black shadow-lg border-none cursor-pointer active:scale-95 transition-all uppercase tracking-widest", 
                                 isDone ? "bg-emerald-500 text-white" : "bg-[#FF4D6D] text-white hover:bg-[#FF4D6D]/90"
                               )}
                             >
                                {isDone ? <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> TAMAM</span> : 'BEK'}
                             </Badge>
                          </div>

                          <div className="flex-1 flex items-center justify-center py-6 overflow-hidden px-2">
                             <h4 className="text-3xl md:text-4xl lg:text-5xl font-black italic leading-[1.05] tracking-tighter uppercase text-primary text-shadow-premium text-center break-words line-clamp-3">
                                {block.topic}
                             </h4>
                          </div>

                          <div className="bg-[#F8FAFC]/90 rounded-[2.5rem] p-6 space-y-5 border border-slate-50 shadow-inner mt-auto">
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-black text-primary/30 uppercase tracking-[0.4em] italic">KONU ÇALIŞMA</span>
                                   <div className="flex gap-4 items-center">
                                      {block.studyResources?.length > 0 ? block.studyResources.map((res: any, idx: number) => (
                                        <a key={idx} href={res.url} target="_blank" className="hover:scale-125 transition-all opacity-60 hover:opacity-100" title={res.type.toUpperCase()}>
                                          {getResourceIcon(res.type)}
                                        </a>
                                      )) : <span className="text-[8px] font-bold opacity-15">YOK</span>}
                                   </div>
                                </div>
                             </div>
                             
                             <div className="h-px w-full bg-slate-200/40" />

                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      <div className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                                      <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em] italic">TEST ÇÖZME</span>
                                   </div>
                                   <div className="flex gap-4 items-center">
                                      {block.testResources?.length > 0 ? block.testResources.map((res: any, idx: number) => (
                                        <a key={idx} href={res.url} target="_blank" className="hover:scale-125 transition-all opacity-80" title={res.type.toUpperCase()}>
                                          {getResourceIcon(res.type)}
                                        </a>
                                      )) : <span className="text-[8px] font-bold opacity-15">YOK</span>}
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-4 mt-4">
                             <Button 
                               onClick={() => router.push('/dashboard/planning')} 
                               className="flex-1 h-14 rounded-2xl bg-[#0F172A] text-white font-black uppercase text-[11px] tracking-[0.3em] gap-3 shadow-2xl hover:bg-accent transition-all active:scale-95 group/btn"
                             >
                               DÜZENLE <Edit3 className="h-4 w-4 text-accent group-hover/btn:scale-110 transition-transform" />
                             </Button>
                             <Button 
                               onClick={() => handleTaskAction(block.id, 'delete')} 
                               variant="ghost" 
                               size="icon" 
                               className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 hover:bg-destructive hover:text-white transition-all shadow-md active:scale-95"
                             >
                               <Trash2 className="h-6 w-6" />
                             </Button>
                          </div>
                     </div>
                  </Card>
                );
             })}
             
             {(!currentDayPlan || currentDayPlan?.blocks?.length === 0) && (
                <Card onClick={() => router.push('/dashboard/planning')} className="xl:col-span-4 h-[400px] text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-8 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all group w-full shadow-inner">
                   <div className="h-20 w-20 rounded-[2rem] bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="h-10 w-10 text-accent animate-pulse" />
                   </div>
                   <div className="space-y-3">
                      <p className="text-4xl font-black uppercase tracking-[0.3em] text-primary/10 italic">BUGÜN BOŞ</p>
                      <p className="text-[11px] font-bold text-primary/5 uppercase tracking-[0.4em] italic">AKADEMİK TERMİNALİ ÇALIŞTIRIN</p>
                   </div>
                </Card>
             )}
        </div>
      </section>
    </div>
  );
}
