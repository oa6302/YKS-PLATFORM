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
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, isSameMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, addDays, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
      if (existing && (existing.status === 'done' || existing.isManuallyEdited || existing.youtubeUrl || existing.customLinkUrl || existing.mebiUrl || existing.ogmKonuUrl || existing.ogmTestUrl)) {
        return existing;
      }
      return { id: `block_${dateStr}_${time.replace(':', '')}`, time, ...defaultData };
    };

    // 10:00 - Main Topic
    const p1Pool = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const p1Lessons = Object.keys(p1Pool);
    const p1L = p1Lessons[i % p1Lessons.length];
    dailyBlocks.push(getProtectedBlock('10:00', {
      lesson: p1L,
      topic: getNextTopic(p1L, p1Pool),
      status: 'waiting',
      examType: isAytStarted ? 'AYT' : 'TYT'
    }));

    // 11:00 - Second Topic
    const p2Lessons = Object.keys(TYT_SOZEL_TOPICS);
    const p2L = p2Lessons[(i + 2) % p2Lessons.length];
    dailyBlocks.push(getProtectedBlock('11:00', {
      lesson: p2L,
      topic: getNextTopic(p2L, TYT_SOZEL_TOPICS),
      status: 'waiting',
      examType: 'TYT'
    }));

    // 12:00 - Review
    dailyBlocks.push(getProtectedBlock('12:00', {
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      status: 'waiting',
      examType: 'GENEL'
    }));

    // 15:00 - Paragraph
    dailyBlocks.push(getProtectedBlock('15:00', {
      lesson: 'TYT TÜRKÇE',
      topic: '20 ADET PARAGRAF KONDİSYONU',
      status: 'waiting',
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
  
  const [viewMode, setViewMode] = useState<string>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2026, 8, 1));
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2027-06-15');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);

  useEffect(() => {
    if (studyPlan?.startDate) setStartDate(studyPlan.startDate);
    if (studyPlan?.endDate) setEndDate(studyPlan.endDate);
  }, [studyPlan]);

  const academicMonths = useMemo(() => [
    { label: 'EYLÜL', date: new Date(2026, 8, 1) },
    { label: 'EKİM', date: new Date(2026, 9, 1) },
    { label: 'KASIM', date: new Date(2026, 10, 1) },
    { label: 'ARALIK', date: new Date(2026, 11, 1), isAyt: true },
    { label: 'OCAK', date: new Date(2027, 0, 1) },
    { label: 'ŞUBAT', date: new Date(2027, 1, 1) },
    { label: 'MART', date: new Date(2027, 2, 1) },
    { label: 'NİSAN', date: new Date(2027, 3, 1) },
    { label: 'MAYIS', date: new Date(2027, 4, 1) },
    { label: 'HAZİRAN', date: new Date(2027, 5, 1) }
  ], []);

  const filteredPlan = useMemo(() => {
    if (!studyPlan?.masterPlan) return [];
    if (viewMode === 'annual') return studyPlan.masterPlan;
    if (viewMode === 'daily') {
      return studyPlan.masterPlan.filter((d: any) => 
        !isBefore(parseISO(d.date), parseISO(startDate)) && 
        !isAfter(parseISO(d.date), parseISO(endDate))
      );
    }
    const mStr = format(selectedMonth, 'yyyy-MM');
    return studyPlan.masterPlan.filter((d: any) => d.date.startsWith(mStr));
  }, [studyPlan, viewMode, startDate, endDate, selectedMonth]);

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
    toast({ title: action === 'done' ? 'Mühürlendi' : 'Silindi', className: "bg-primary text-white rounded-xl" });
  };

  const handleRegeneratePlan = async () => {
    if (!db || !user || !userData) return;
    setIsRegenerating(true);
    try {
      const newPlan = generateAdaptivePlan(startDate, endDate, userData.completedTopics || {}, studyPlan?.masterPlan || []);
      await setDoc(doc(db, 'studyPlans', user.uid), {
        userId: user.uid,
        startDate: startDate,
        endDate: endDate,
        masterPlan: newPlan,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "TERMİNAL SENKRONİZE EDİLDİ", className: "bg-accent text-primary rounded-2xl font-black shadow-2xl" });
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
      setStartDate(d); setEndDate(d); setViewMode('daily');
    } else if (type === 'week') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setViewMode('daily');
    } else if (type === 'month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
      setViewMode('daily');
    } else if (type === 'year') {
      setStartDate('2026-09-01');
      setEndDate('2027-06-15');
      setViewMode('annual');
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
               <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-accent/20"><Calendar className="h-3.5 w-3.5" /> ACADEMIC TERMINAL v48.5</div>
               <h1 className="text-6xl sm:text-8xl md:text-[10rem] lg:text-[12rem] font-black tracking-tighter italic text-primary uppercase leading-[0.75] text-shadow-premium break-words">Akademik <br /><span className="text-accent text-shadow-accent">Terminal</span></h1>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-auto shrink-0">
            <Card className="p-5 rounded-[2.5rem] border-none shadow-[0_40px_80px_-20px_rgba(15,23,42,0.12)] bg-white flex flex-wrap gap-4 items-end justify-center lg:justify-start relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="space-y-1 relative z-10 flex-1 sm:flex-none">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-2 italic">MİLAT (BAŞLANGIÇ)</Label>
                  <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setViewMode('daily'); }} className="h-12 w-full sm:w-[150px] rounded-xl bg-slate-50 border-none font-bold text-xs px-4 shadow-inner" />
               </div>
               <div className="space-y-1 relative z-10 flex-1 sm:flex-none">
                  <Label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-2 italic">FİNAL (SINAV)</Label>
                  <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setViewMode('daily'); }} className="h-12 w-full sm:w-[150px] rounded-xl bg-slate-50 border-none font-bold text-xs px-4 shadow-inner" />
               </div>
               <Button onClick={handleRegeneratePlan} disabled={isRegenerating} className="h-12 px-6 rounded-xl bg-primary hover:bg-accent text-white font-black text-[9px] uppercase tracking-widest gap-2 shadow-2xl transition-all relative z-10 w-full sm:w-auto">
                  {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-accent" />} RAPORU ÇALIŞTIR
               </Button>
            </Card>
            <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-primary/5 shadow-lg overflow-x-auto scrollbar-hide">
              {['today', 'week', 'month', 'year'].map(f => (
                <button key={f} onClick={() => handleQuickFilter(f)} className="h-9 px-3 rounded-lg font-black text-[8px] uppercase tracking-widest text-primary/40 hover:bg-slate-50 hover:text-primary transition-all">
                  {f === 'today' ? 'BUGÜN' : f === 'week' ? 'BU HAFTA' : f === 'month' ? 'BU AY' : 'TÜM YIL'}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
           {[
             { label: 'İLERLEME', val: `%${stats.rate}`, sub: 'YILLIK BAŞARI', color: 'primary', icon: Target },
             { label: 'PLANLANAN', val: stats.planned, sub: 'TOPLAM GÖREV', color: 'accent', icon: Calendar },
             { label: 'TAMAMLANAN', val: stats.completed, sub: 'MÜHÜRLENEN', color: 'primary', icon: CheckCircle2 },
             { label: 'EKSİK', val: stats.missing, sub: 'KRİTİK YOLLAR', color: 'accent', icon: AlertCircle },
             { label: 'DURUM', val: stats.rate > 70 ? 'STABİL' : 'RİSKLİ', sub: 'AI ANALİZİ', color: 'primary', icon: Brain },
           ].map((item, i) => (
             <Card key={i} className="p-6 border border-primary/5 bg-white rounded-[2.5rem] shadow-lg">
                <div className="space-y-3">
                   <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md", item.color === 'accent' ? 'bg-accent' : 'bg-primary')}>
                      <item.icon className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5 italic">{item.label}</p>
                      <p className="text-5xl font-black text-primary italic tracking-tighter">{item.val}</p>
                   </div>
                </div>
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
                          "aspect-square p-6 sm:p-8 rounded-[3rem] sm:rounded-[4rem] border-none transition-all hover:scale-[1.03] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.15)] group relative overflow-hidden bg-white h-full flex flex-col",
                          isDone && "opacity-60 grayscale-[0.4]"
                        )}
                      >
                         <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-2">
                               <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-primary flex items-center gap-2 border border-amber-100 shadow-sm">
                                  <Clock className="h-3.5 w-3.5 text-accent" />
                                  <span className="text-[10px] font-black">{block.time}</span>
                               </div>
                               <span className="text-[8px] font-black text-primary/15 uppercase tracking-[0.3em] italic">#{block.examType}</span>
                            </div>
                            <Badge 
                              onClick={() => handleTaskAction(block.id, day.date, 'done')}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-[8px] font-black shadow-lg border-none cursor-pointer active:scale-95 transition-all uppercase tracking-widest", 
                                isDone ? "bg-emerald-500 text-white" : "bg-[#FF4D6D] text-white"
                              )}
                            >
                              {isDone ? 'TAMAM' : 'BEK'}
                            </Badge>
                         </div>

                         <div className="flex-1 flex items-center justify-center py-4 overflow-hidden px-1">
                           <h4 className={cn("text-2xl md:text-4xl lg:text-5xl font-black italic leading-[1.05] tracking-tighter uppercase text-primary text-shadow-premium text-center break-words line-clamp-3", isDone && "text-primary/50 line-through decoration-2")}>
                             {block.topic}
                           </h4>
                         </div>

                         <div className="bg-[#F8FAFC]/90 rounded-[2rem] p-4 space-y-4 border border-slate-50 shadow-inner mt-auto">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black text-primary/30 uppercase tracking-[0.4em] italic">KAYNAKLAR</span>
                              <div className="flex gap-3 items-center">
                                 {block.youtubeUrl && <a href={block.youtubeUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><Youtube className="h-4 w-4 text-rose-500" /></a>}
                                 {block.mebiUrl && <a href={block.mebiUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><GraduationCap className="h-4 w-4 text-emerald-500" /></a>}
                                 {block.customLinkUrl && <a href={block.customLinkUrl} target="_blank" className="hover:scale-125 transition-all opacity-60"><LinkIcon className="h-4 w-4 text-primary" /></a>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                               <Button onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="flex-1 h-10 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.3em] gap-2 shadow-2xl hover:bg-accent transition-all active:scale-95">DÜZENLE <Edit3 className="h-3.5 w-3.5 text-accent" /></Button>
                               <Button onClick={() => handleTaskAction(block.id, day.date, 'delete')} variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-md"><Trash2 className="h-5 w-5" /></Button>
                            </div>
                         </div>
                      </Card>
                    );
                  })}
                  <Card onClick={() => { /* Ekleme Mantığı Gelecek */ }} className="aspect-square p-6 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all group opacity-50">
                     <Plus className="h-12 w-12 text-primary opacity-20 group-hover:scale-110 transition-all" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">GÖREV EKLE</p>
                  </Card>
               </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[4rem] border-none shadow-2xl p-10 bg-white max-w-lg overflow-hidden">
           <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <DialogTitle className="text-4xl font-black italic tracking-tighter text-primary uppercase leading-none">
                GÖREV <span className="text-accent">DÜZENLE</span>
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)} className="rounded-full h-10 w-10 bg-slate-50"><X className="h-5 w-5" /></Button>
           </DialogHeader>
           {editingBlock && (
             <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-4 italic">KONU / GÖREV ADI</Label>
                  <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg px-8 shadow-inner focus-visible:ring-accent" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase opacity-40 ml-4">YOUTUBE DERS</Label>
                      <Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-14 rounded-xl bg-slate-50 border-none shadow-inner text-xs px-6" placeholder="URL" />
                   </div>
                   <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase opacity-40 ml-4">ÖZEL LİNK</Label>
                      <Input value={editingBlock.customLinkUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, customLinkUrl: e.target.value, isManuallyEdited: true})} className="h-14 rounded-xl bg-slate-50 border-none shadow-inner text-xs px-6" placeholder="URL" />
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
                  toast({ title: 'Terminal Güncellendi', className: "bg-primary text-white rounded-2xl shadow-2xl" });
                }} className="w-full h-20 rounded-[2.5rem] bg-primary hover:bg-accent text-white font-black text-lg uppercase tracking-[0.3em] gap-4 shadow-2xl transition-all">
                  KAYDET <Save className="h-6 w-6 text-accent" />
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
