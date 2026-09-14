'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, Zap, Loader2, Sparkles, 
  ArrowLeft, Home, Edit3, Youtube, Save, FileText, 
  BookOpen, X, Clock, Target, Brain,
  CheckCircle2, AlertCircle, Trash2, Link as LinkIcon, GraduationCap,
  Plus, School, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, isAfter, addDays, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { TYT_SOZEL_TOPICS, AYT_SOZEL_TOPICS } from '@/lib/curriculum-data';

// --- ADAPTIVE GENERATION ENGINE WITH ZERO-LOSS PROTECTION ---
const generateAdaptivePlan = (
  startDateStr: string,
  endDateStr: string,
  completedTopics: Record<string, string[]> = {},
  existingPlan: any[] = []
) => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO('2026-12-01');
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
    return 'GENEL TEKRAR';
  };

  for (let i = 0; i <= daysInterval; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayName = format(currentDate, 'EEEE', { locale: tr });
    const isAytStarted = !isBefore(currentDate, aytDate);
    
    const existingDay = existingPlan.find(d => d.date === dateStr);
    const dailyBlocks = [];

    const getProtectedBlock = (time: string, defaultData: any) => {
      const existing = existingDay?.blocks?.find((b: any) => b.time === time);
      // Data Shield: Protect completed or manually edited blocks
      if (existing && (
        existing.status === 'done' || 
        existing.isManuallyEdited || 
        existing.youtubeUrl || 
        existing.mebiUrl || 
        existing.ebaUrl || 
        existing.ogmUrl || 
        existing.customLinkUrl
      )) {
        return existing;
      }
      return { 
        id: `block_${dateStr}_${time.replace(':', '')}`, 
        time, 
        ...defaultData,
        status: 'waiting',
        isManuallyEdited: false
      };
    };

    const p1Pool = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const p1Lessons = Object.keys(p1Pool);
    const p1L = p1Lessons[i % p1Lessons.length];
    dailyBlocks.push(getProtectedBlock('10:00', {
      lesson: p1L,
      topic: getNextTopic(p1L, p1Pool),
      examType: isAytStarted ? 'AYT' : 'TYT'
    }));

    const p2Lessons = Object.keys(TYT_SOZEL_TOPICS);
    const p2L = p2Lessons[(i + 2) % p2Lessons.length];
    dailyBlocks.push(getProtectedBlock('11:00', {
      lesson: p2L,
      topic: getNextTopic(p2L, TYT_SOZEL_TOPICS),
      examType: 'TYT'
    }));

    dailyBlocks.push(getProtectedBlock('12:00', {
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      examType: 'GENEL'
    }));

    dailyBlocks.push(getProtectedBlock('15:00', {
      lesson: 'TYT TÜRKÇE',
      topic: '20 ADET PARAGRAF KONDİSYONU',
      examType: 'TYT'
    }));

    plan.push({ date: dateStr, day: dayName, blocks: dailyBlocks });
  }

  return plan;
};

export default function PlanningPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  const { data: studyPlan } = useDoc<any>(user?.uid ? `studyPlans/${user.uid}` : null);
  
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2027-06-15');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);

  useEffect(() => {
    if (studyPlan?.startDate) setStartDate(studyPlan.startDate);
    if (studyPlan?.endDate) setEndDate(studyPlan.endDate);
  }, [studyPlan]);

  const filteredPlan = useMemo(() => {
    if (!studyPlan?.masterPlan) return [];
    return studyPlan.masterPlan.filter((d: any) => 
      !isBefore(parseISO(d.date), parseISO(startDate)) && 
      !isAfter(parseISO(d.date), parseISO(endDate))
    );
  }, [studyPlan, startDate, endDate]);

  const stats = useMemo(() => {
    if (!studyPlan?.masterPlan) return { planned: 0, completed: 0, missing: 0, rate: 0 };
    const total = studyPlan.masterPlan.reduce((acc: number, day: any) => acc + (day.blocks?.length || 0), 0);
    const done = studyPlan.masterPlan.reduce((acc: number, day: any) => acc + (day.blocks?.filter((b: any) => b.status === 'done').length || 0), 0);
    return { planned: total, completed: done, missing: total - done, rate: Math.round((done / (total || 1)) * 100) };
  }, [studyPlan]);

  const handleTaskAction = async (blockId: string, dayDate: string, action: 'done' | 'delete') => {
    if (!db || !user || !studyPlan) return;
    const newPlan = studyPlan.masterPlan.map((day: any) => {
      if (day.date === dayDate) {
        return {
          ...day,
          blocks: day.blocks.map((b: any) => {
            if (b.id === blockId) {
              if (action === 'done') return { ...b, status: b.status === 'done' ? 'waiting' : 'done' };
              if (action === 'delete') return null;
            }
            return b;
          }).filter(Boolean)
        };
      }
      return day;
    });
    await updateDoc(doc(db, 'studyPlans', user.uid), { masterPlan: newPlan, updatedAt: serverTimestamp() });
    toast({ title: action === 'done' ? 'Mühürlendi' : 'Silindi' });
  };

  const handleRegeneratePlan = async () => {
    if (!db || !user || !userData) return;
    setIsRegenerating(true);
    try {
      const newPlan = generateAdaptivePlan(startDate, endDate, userData.completedTopics || {}, studyPlan?.masterPlan || []);
      await setDoc(doc(db, 'studyPlans', user.uid), {
        userId: user.uid,
        startDate,
        endDate,
        masterPlan: newPlan,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "TERMİNAL SENKRONİZE EDİLDİ" });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata' });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleQuickFilter = (type: string) => {
    const now = new Date();
    if (type === 'today') {
      const d = format(now, 'yyyy-MM-dd');
      setStartDate(d); setEndDate(d);
    } else if (type === 'week') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (type === 'year') {
      setStartDate('2026-09-01');
      setEndDate('2027-06-15');
    }
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pb-20">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-8 md:px-10 space-y-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="flex flex-col gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-6 w-6" /></Button>
               <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-6 w-6" /></Button>
            </div>
            <div className="space-y-2">
               <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-accent/20"><Calendar className="h-3.5 w-3.5" /> ACADEMIC TERMINAL v55.0</div>
               <h1 className="text-6xl sm:text-7xl lg:text-[8rem] font-black tracking-tighter italic text-primary uppercase leading-[0.75] text-shadow-premium break-words">Akademik <br /><span className="text-accent text-shadow-accent">Terminal</span></h1>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-auto shrink-0">
            <Card className="p-5 rounded-[2.5rem] border-none shadow-[0_40px_80px_-20px_rgba(15,23,42,0.12)] bg-white flex flex-wrap gap-4 items-end justify-center lg:justify-start relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="space-y-1 relative z-10 flex-1 sm:flex-none">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-2 italic">MİLAT (BAŞLANGIÇ)</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 w-full sm:w-[150px] rounded-xl bg-slate-50 border-none font-bold text-xs px-4 shadow-inner" />
               </div>
               <div className="space-y-1 relative z-10 flex-1 sm:flex-none">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-2 italic">FİNAL (SINAV)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 w-full sm:w-[150px] rounded-xl bg-slate-50 border-none font-bold text-xs px-4 shadow-inner" />
               </div>
               <Button onClick={handleRegeneratePlan} disabled={isRegenerating} className="h-12 px-6 rounded-xl bg-primary hover:bg-accent text-white font-black text-[9px] uppercase tracking-widest gap-2 shadow-2xl transition-all relative z-10 w-full sm:w-auto">
                  {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-accent" />} RAPORU ÇALIŞTIR
               </Button>
            </Card>
            <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-primary/5 shadow-lg overflow-x-auto scrollbar-hide">
              {['today', 'week', 'year'].map(f => (
                <button key={f} onClick={() => handleQuickFilter(f)} className="h-9 px-4 rounded-lg font-black text-[8px] uppercase tracking-widest text-primary/40 hover:bg-slate-50 hover:text-primary transition-all">
                  {f === 'today' ? 'BUGÜN' : f === 'week' ? 'BU HAFTA' : 'TÜM YIL'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
           {[
             { label: 'İLERLEME', val: `%${stats.rate}`, icon: Target },
             { label: 'PLANLANAN', val: stats.planned, icon: Calendar },
             { label: 'TAMAMLANAN', val: stats.completed, icon: CheckCircle2 },
             { label: 'EKSİK', val: stats.missing, icon: AlertCircle },
             { label: 'DURUM', val: stats.rate > 70 ? 'STABİL' : 'RİSKLİ', icon: Brain },
           ].map((item, i) => (
             <Card key={i} className="relative overflow-hidden p-6 rounded-[2rem] border-none bg-white shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg mb-4">
                   <item.icon className="h-5 w-5" />
                </div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1 italic">{item.label}</p>
                <p className="text-4xl font-black text-primary italic tracking-tighter leading-none">{item.val}</p>
             </Card>
          ))}
        </div>

        <div className="space-y-12">
          {filteredPlan.map((day: any) => (
            <div key={day.date} className="space-y-8">
               <div className="flex items-center gap-6 px-2">
                  <h3 className="text-2xl md:text-4xl font-black italic text-primary uppercase tracking-tighter">{format(parseISO(day.date), 'd MMMM yyyy', { locale: tr })}</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <Badge variant="outline" className="h-10 px-4 rounded-xl font-black uppercase border-2 border-slate-100 text-primary text-[10px]">{day.day}</Badge>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                  {day.blocks?.map((block: any) => {
                    const isDone = block.status === 'done' || block.status === 'completed';
                    return (
                      <Card 
                        key={block.id} 
                        className={cn(
                          "p-0 rounded-[2.5rem] border-none transition-all duration-500 group relative overflow-hidden bg-white flex flex-col shadow-xl hover:-translate-y-2",
                          isDone && "opacity-75"
                        )}
                      >
                         <div className={cn("h-1.5 w-full", isDone ? "bg-emerald-500" : "bg-primary")} />
                         <div className="p-7 space-y-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-primary/40" />
                                  <span className="text-[10px] font-black">{block.time}</span>
                               </div>
                               <button
                                 onClick={() => handleTaskAction(block.id, day.date, 'done')}
                                 className={cn(
                                   "px-3.5 py-1.5 rounded-lg text-[8px] font-black shadow-md transition-all uppercase",
                                   isDone ? "bg-emerald-500 text-white" : "bg-[#FF4D6D] text-white"
                                 )}
                               >
                                 {isDone ? 'TAMAM' : 'BEK'}
                               </button>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-4">
                              <h4 className={cn("text-2xl font-black italic leading-tight text-center uppercase tracking-tighter", isDone ? "text-primary/40 line-through" : "text-primary")}>
                                {block.topic}
                              </h4>
                            </div>
                            <div className="bg-slate-50 rounded-[1.75rem] p-4 space-y-4 shadow-inner">
                               <div className="flex justify-center gap-3">
                                  {block.youtubeUrl && <a href={block.youtubeUrl} target="_blank" className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center transition-all hover:scale-110"><Youtube className="h-4 w-4 text-rose-500" /></a>}
                                  {block.mebiUrl && <a href={block.mebiUrl} target="_blank" className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center transition-all hover:scale-110"><GraduationCap className="h-4 w-4 text-orange-500" /></a>}
                                  {block.ebaUrl && <a href={block.ebaUrl} target="_blank" className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center transition-all hover:scale-110"><School className="h-4 w-4 text-blue-500" /></a>}
                                  {block.ogmUrl && <a href={block.ogmUrl} target="_blank" className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center transition-all hover:scale-110"><BookOpen className="h-4 w-4 text-emerald-500" /></a>}
                                  {block.customLinkUrl && <a href={block.customLinkUrl} target="_blank" className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center transition-all hover:scale-110"><LinkIcon className="h-4 w-4 text-primary" /></a>}
                               </div>
                               <div className="flex gap-2">
                                  <Button onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="flex-1 h-9 rounded-xl bg-primary hover:bg-accent text-white font-black uppercase text-[9px] gap-2 shadow-lg"><Edit3 className="h-3 w-3 text-accent" /> DÜZENLE</Button>
                                  <button onClick={() => handleTaskAction(block.id, day.date, 'delete')} className="h-9 w-9 rounded-xl bg-white text-slate-300 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"><Trash2 className="h-4 w-4" /></button>
                               </div>
                            </div>
                         </div>
                      </Card>
                    );
                  })}
                  <button className="min-h-[220px] rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 hover:bg-accent/5 hover:border-accent transition-all group bg-white">
                     <div className="h-14 w-14 rounded-2xl bg-slate-100 group-hover:bg-accent flex items-center justify-center transition-all">
                        <Plus className="h-6 w-6 text-primary/30 group-hover:text-primary" />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 group-hover:text-primary">GÖREV EKLE</p>
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[4rem] border-none shadow-2xl p-10 bg-white max-w-lg">
           <DialogHeader className="mb-6">
              <DialogTitle className="text-4xl font-black italic tracking-tighter text-primary uppercase">GÖREV <span className="text-accent">DÜZENLE</span></DialogTitle>
              <DialogDescription>Görevi ve kaynak linklerini güncelleyin.</DialogDescription>
           </DialogHeader>
           {editingBlock && (
             <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-4 italic">KONU ADI</Label>
                  <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold opacity-40 ml-4">YOUTUBE</Label>
                      <Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none text-xs" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold opacity-40 ml-4">ÖZEL LİNK</Label>
                      <Input value={editingBlock.customLinkUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, customLinkUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none text-xs" />
                   </div>
                </div>
                <Button onClick={async () => {
                  if (!db || !user || !studyPlan) return;
                  const newPlan = studyPlan.masterPlan.map((day: any) => {
                    if (day.date === editingBlock.date) {
                      return { ...day, blocks: day.blocks.map((b: any) => b.id === editingBlock.id ? { ...editingBlock } : b) };
                    }
                    return day;
                  });
                  await updateDoc(doc(db, 'studyPlans', user.uid), { masterPlan: newPlan, updatedAt: serverTimestamp() });
                  setIsEditDialogOpen(false);
                  toast({ title: 'Terminal Güncellendi', className: "bg-primary text-white" });
                }} className="w-full h-20 rounded-[2.5rem] bg-primary text-white font-black text-lg uppercase tracking-widest">KAYDET <Save className="ml-3 h-6 w-6 text-accent" /></Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
