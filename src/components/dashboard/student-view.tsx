
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
    if (!db || !user || !studyPlan || !today) return;
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
    await updateDoc(doc(db, 'studyPlans', user.uid), { masterPlan: newPlan, updatedAt: serverTimestamp() });
    toast({ 
      title: action === 'done' ? 'Terminal Güncellendi' : 'Görevi İptal Edildi', 
      className: "bg-primary text-white rounded-2xl shadow-2xl" 
    });
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
    <div className="p-4 md:p-8 space-y-10 max-w-[1600px] mx-auto w-full animate-in fade-in duration-1000 bg-[#F8FAFC]">
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-2">
           <div className="space-y-2 text-center md:text-left overflow-hidden">
              <h2 className="text-4xl md:text-6xl lg:text-[8rem] font-black italic leading-[0.85] tracking-tighter text-primary uppercase text-shadow-premium break-words">
                 BUGÜNKÜ<br />BLOKLARIN
              </h2>
           </div>
           <Card className="bg-white rounded-[2rem] px-8 py-5 flex items-center gap-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] border-none shrink-0 w-full md:w-auto">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                 <Calendar className="h-5 w-5 text-primary opacity-20" />
              </div>
              <div className="text-right flex-1 md:flex-none">
                 <p className="text-xl font-black italic tracking-tighter text-primary leading-none">{format(new Date(), 'd MMMM', { locale: tr }).toUpperCase()}</p>
                 <p className="text-[9px] font-black text-primary/20 uppercase tracking-[0.3em] mt-1">{format(new Date(), 'yyyy')}</p>
              </div>
           </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {currentDayPlan?.blocks?.map((block: any) => {
                const isDone = block.status === 'done' || block.status === 'completed';
                return (
                  <Card 
                    key={block.id} 
                    className={cn(
                      "aspect-square p-8 rounded-[3.5rem] border-none transition-all hover:scale-[1.03] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.12)] group relative overflow-hidden bg-white h-full flex flex-col",
                      isDone && "opacity-50 grayscale-[0.5]"
                    )}
                  >
                     <div className="space-y-6 relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-2">
                                <div className="px-3 py-1.5 rounded-xl bg-[#FFF8E7] text-[#0F172A] flex items-center gap-2 border border-[#FEF3C7] shadow-sm">
                                  <Clock className="h-3.5 w-3.5 text-accent" />
                                  <span className="text-[11px] font-black">{block.time || '10:00'}</span>
                                </div>
                                <span className="text-[10px] font-black text-primary/10 uppercase tracking-[0.2em] italic">#{block.examType}</span>
                             </div>
                             <Badge 
                               onClick={() => handleTaskAction(block.id, 'done')}
                               className={cn(
                                 "px-4 py-1.5 rounded-xl text-[10px] font-black shadow-md border-none cursor-pointer active:scale-95 transition-all uppercase tracking-widest", 
                                 isDone ? "bg-emerald-500 text-white" : "bg-[#FF4D6D] text-white hover:bg-[#FF4D6D]/90"
                               )}
                             >
                                {isDone ? 'TAMAM' : 'BEK'}
                             </Badge>
                          </div>

                          <div className="flex-1 flex items-center justify-center py-4 overflow-hidden px-1">
                             <h4 className="text-2xl md:text-3xl lg:text-4xl font-black italic leading-[1.1] tracking-tighter uppercase text-primary text-shadow-premium text-center break-words line-clamp-3">
                                {block.topic}
                             </h4>
                          </div>

                          <div className="bg-[#F8FAFC]/80 rounded-[2rem] p-5 space-y-4 border border-slate-50 shadow-inner mt-auto">
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                   <span className="text-[9px] font-black text-primary/30 uppercase tracking-[0.3em] italic">KONU ÇALIŞMA</span>
                                   <div className="flex gap-3 items-center">
                                      {block.studyResources?.length > 0 ? block.studyResources.map((res: any, idx: number) => (
                                        <a key={idx} href={res.url} target="_blank" className="hover:scale-110 transition-all opacity-60 hover:opacity-100" title={res.type.toUpperCase()}>
                                          {getResourceIcon(res.type)}
                                        </a>
                                      )) : <span className="text-[8px] font-bold opacity-20">YOK</span>}
                                   </div>
                                </div>
                             </div>
                             
                             <div className="h-px w-full bg-slate-200/50" />

                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-1.5">
                                      <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                                      <span className="text-[9px] font-black text-accent uppercase tracking-[0.3em] italic">TEST ÇÖZME</span>
                                   </div>
                                   <div className="flex gap-3 items-center">
                                      {block.testResources?.length > 0 ? block.testResources.map((res: any, idx: number) => (
                                        <a key={idx} href={res.url} target="_blank" className="hover:scale-110 transition-all opacity-80" title={res.type.toUpperCase()}>
                                          {getResourceIcon(res.type)}
                                        </a>
                                      )) : <span className="text-[8px] font-bold opacity-20">YOK</span>}
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-3 mt-2">
                             <Button 
                               onClick={() => router.push('/dashboard/planning')} 
                               className="flex-1 h-12 rounded-2xl bg-[#0F172A] text-white font-black uppercase text-[10px] tracking-[0.3em] gap-2 shadow-xl hover:bg-accent transition-all"
                             >
                               DÜZENLE <Edit3 className="h-3.5 w-3.5 text-accent" />
                             </Button>
                             <Button 
                               onClick={() => handleTaskAction(block.id, 'delete')} 
                               variant="ghost" 
                               size="icon" 
                               className="h-12 w-12 rounded-2xl bg-slate-50 text-destructive hover:bg-destructive hover:text-white transition-all shadow-md"
                             >
                               <Trash2 className="h-5 w-5" />
                             </Button>
                          </div>
                     </div>
                  </Card>
                );
             })}
             
             {(!currentDayPlan || currentDayPlan?.blocks?.length === 0) && (
                <Card onClick={() => router.push('/dashboard/planning')} className="lg:col-span-4 h-[300px] text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-accent/30 transition-all group w-full">
                   <Zap className="h-12 w-12 text-accent opacity-20 group-hover:scale-110 transition-transform" />
                   <div className="space-y-2">
                      <p className="text-2xl font-black uppercase tracking-[0.3em] text-primary/10 italic">BUGÜN BOŞ</p>
                      <p className="text-[9px] font-bold text-primary/5 uppercase tracking-widest italic">AKADEMİK TERMİNALİ ÇALIŞTIRIN</p>
                   </div>
                </Card>
             )}
        </div>
      </section>
    </div>
  );
}
