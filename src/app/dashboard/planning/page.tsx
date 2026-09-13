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
      // Logic: If block is done, edited, or has any link, protect it.
      if (existing && (
        existing.status === 'done' || 
        existing.isManuallyEdited || 
        existing.youtubeUrl || 
        existing.mebiUrl || 
        existing.ogmKonuUrl || 
        existing.ogmTestUrl || 
        existing.customLinkUrl
      )) {
        return existing;
      }
      return { 
        id: `block_${dateStr}_${time.replace(':', '')}`, 
        time, 
        ...defaultData,
        status: 'waiting'
      };
    };

    const p1Pool = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const p1L = Object.keys(p1Pool)[i % Object.keys(p1Pool).length];
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
  const { data: studyPlan, loading: planLoading } = useDoc<any>(user?.uid ? `studyPlans/${user.uid}` : null);
  
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
    const done = studyPlan.masterPlan.reduce((acc: number, day: any) => acc + (day.blocks?.filter((b: any) => b.status === 'done' || b.status === 'completed').length || 0), 0);
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
      toast({ title: "TERMİNAL SENKRONİZE EDİLDİ", className: "bg-accent text-primary rounded-2xl font-black shadow-2xl border-none" });
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
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-5 w-5" /></Button>
               <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-5 w-5" /></Button>
            </div>
            <div className="space-y-2">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-primary font-black text-[9px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-accent/20"><Calendar className="h-3 w-3" /> COMMAND CENTER v50.0</div>
               <h2 className="text-6xl sm:text-8xl md:text-[10rem] lg:text-[12rem] font-black tracking-tighter italic text-primary uppercase leading-[0.75] text-shadow-premium break-words">Akademik <br /><span className="text-accent text-shadow-accent">Terminal</span></h2>
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
            
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
               <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-primary/5 shadow-lg overflow-x-auto scrollbar-hide w-full sm:w-auto justify-center">
                  {['today', 'week', 'month', 'year'].map(f => (
                    <button key={f} onClick={() => handleQuickFilter(f)} className="h-9 px-3 rounded-lg font-black text-[8px] uppercase tracking-widest text-primary/40 hover:bg-slate-50 hover:text-primary transition-all">
                      {f === 'today' ? 'BUGÜN' : f === 'week' ? 'BU HAFTA' : f === 'month' ? 'BU AY' : 'TÜM YIL'}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 animate-in fade-in duration-700">
           {[
             { label: 'İLERLEME', val: `%${stats.rate}`, sub: 'YILLIK BAŞARI', color: 'primary', icon: Target },
             { label: 'PLANLANAN', val: stats.planned, sub: 'TOPLAM GÖREV', color: 'accent', icon: Calendar },
             { label: 'TAMAMLANAN', val: stats.completed, sub: 'MÜHÜRLENEN', color: 'primary', icon: CheckCircle2 },
             { label: 'EKSİK', val: stats.missing, sub: 'KRİTİK YOLLAR', color: 'accent', icon: AlertCircle },
             { label: 'DURUM', val: stats.rate > 70 ? 'STABİL' : 'RİSKLİ', sub: 'AI ANALİZİ', color: 'primary', icon: Brain },
           ].map((item, i) => (
             <Card key={i} className="p-6 border border-primary/5 group relative overflow-hidden bg-white rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all">
                <div className="space-y-4 relative z-10">
                   <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md", item.color === 'accent' ? 'bg-accent' : 'bg-primary')}>
                      <item.icon className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1 italic">{item.label}</p>
                      <p className="text-5xl font-black text-primary italic tracking-tighter">{item.val}</p>
                      <p className="text-[9px] font-bold text-muted-foreground/30 uppercase mt-2 tracking-widest">{item.sub}</p>
                   </div>
                </div>
             </Card>
           ))}
        </div>

        {/* Plan Days */}
        <div className="space-y-16">
          {filteredPlan.map((day: any) => (
            <div key={day.date} className="space-y-8">
               <div className="flex items-center gap-6 px-2">
                  <h3 className="text-3xl md:text-5xl font-black italic text-primary uppercase tracking-tighter">{format(parseISO(day.date), 'd MMMM yyyy', { locale: tr })}</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <Badge variant="outline" className="h-10 px-4 rounded-xl font-black uppercase border-2 border-slate-100 text-primary text-[10px]">{day.day}</Badge>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {day.blocks?.map((block: any) => {
                    const isDone = block.status === 'done' || block.status === 'completed';
                    return (
                      <Card 
                        key={block.id} 
                        className={cn(
                          "min-h-[350px] p-8 rounded-[3.5rem] border-none transition-all duration-500 group relative overflow-hidden bg-white flex flex-col justify-between",
                          "shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] hover:shadow-[0_40px_80px_-25px_rgba(15,23,42,0.25)] hover:-translate-y-2",
                          isDone && "opacity-75 grayscale-[0.3]"
                        )}
                      >
                         <div className={cn("absolute top-0 left-0 w-full h-2", isDone ? "bg-emerald-500" : "bg-primary")} />
                         
                         <div className="space-y-6">
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-primary flex items-center gap-1.5 border border-slate-100 shadow-sm">
                                     <Clock className="h-3 w-3 text-accent" />
                                     <span className="text-[10px] font-black">{block.time}</span>
                                  </div>
                                  <span className="text-[8px] font-black text-primary/10 uppercase tracking-widest italic">#{block.examType}</span>
                               </div>
                               <button 
                                 onClick={() => handleTaskAction(block.id, day.date, 'done')}
                                 className={cn("h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95", isDone ? "bg-emerald-500 text-white" : "bg-rose-500 text-white hover:bg-primary")}
                               >
                                 {isDone ? 'MÜHÜRLÜ' : 'BEKLEMEDE'}
                               </button>
                            </div>

                            <div className="py-4">
                               <h4 className={cn("text-3xl font-black italic tracking-tighter uppercase leading-[1.1] text-primary transition-all", isDone && "line-through opacity-40")}>
                                  {block.topic}
                               </h4>
                               <p className="text-[9px] font-bold text-accent uppercase tracking-widest mt-2">{block.lesson}</p>
                            </div>
                         </div>

                         <div className="space-y-6 mt-auto">
                            <div className="grid grid-cols-5 gap-2 p-2 bg-slate-50 rounded-2xl shadow-inner border border-slate-100">
                               {[
                                 { icon: Youtube, url: block.youtubeUrl, color: 'text-rose-500' },
                                 { icon: GraduationCap, url: block.mebiUrl, color: 'text-emerald-500' },
                                 { icon: BookOpen, url: block.ogmKonuUrl, color: 'text-blue-500' },
                                 { icon: FileText, url: block.ogmTestUrl, color: 'text-sky-500' },
                                 { icon: LinkIcon, url: block.customLinkUrl, color: 'text-primary' }
                               ].map((src, idx) => (
                                 <a key={idx} href={src.url || '#'} target="_blank" className={cn("h-10 rounded-xl flex items-center justify-center transition-all", src.url ? `bg-white shadow-sm border border-white hover:scale-110 ${src.color}` : "opacity-10 pointer-events-none")}>
                                    <src.icon className="h-5 w-5" strokeWidth={2.5} />
                                 </a>
                               ))}
                            </div>
                            
                            <div className="flex gap-2">
                               <Button onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="flex-1 h-12 rounded-2xl bg-[#0F172A] hover:bg-accent text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl">
                                  DÜZENLE <Edit3 className="h-4 w-4 text-accent" />
                               </Button>
                               <Button onClick={() => handleTaskAction(block.id, day.date, 'delete')} variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-300 hover:bg-destructive hover:text-white transition-all shadow-sm">
                                  <Trash2 className="h-5 w-5" />
                               </Button>
                            </div>
                         </div>
                      </Card>
                    );
                  })}
               </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl p-10 bg-white max-w-2xl overflow-hidden mx-4">
           <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <div className="space-y-1">
                <DialogTitle className="text-4xl font-black italic tracking-tighter text-primary uppercase leading-none">
                  GÖREV <span className="text-accent">DÜZENLE</span>
                </DialogTitle>
                <DialogDescription className="font-medium italic opacity-40 uppercase tracking-widest text-[9px]">Sıfır Veri Kaybı Protokolü Aktif</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)} className="rounded-full h-10 w-10 bg-slate-50"><X className="h-5 w-5" /></Button>
           </DialogHeader>
           {editingBlock && (
             <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 scrollbar-hide">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-4 italic">KONU / GÖREV ADI</Label>
                  <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none font-bold text-lg px-8 shadow-inner focus-visible:ring-accent" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 ml-4 italic">KONU KAYNAKLARI</Label>
                      <div className="space-y-3">
                         <div className="relative group"><Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 opacity-40" /><Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none pl-12 text-xs font-bold" placeholder="YouTube URL" /></div>
                         <div className="relative group"><GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 opacity-40" /><Input value={editingBlock.mebiUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, mebiUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none pl-12 text-xs font-bold" placeholder="MEBİ URL" /></div>
                         <div className="relative group"><BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 opacity-40" /><Input value={editingBlock.ogmKonuUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, ogmKonuUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none pl-12 text-xs font-bold" placeholder="OGM Konu URL" /></div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 ml-4 italic text-accent">TEST KAYNAKLARI</Label>
                      <div className="space-y-3">
                         <div className="relative group"><FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 opacity-40" /><Input value={editingBlock.ogmTestUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, ogmTestUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none pl-12 text-xs font-bold" placeholder="OGM Test URL" /></div>
                         <div className="relative group"><LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" /><Input value={editingBlock.customLinkUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, customLinkUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none pl-12 text-xs font-bold" placeholder="Özel Ders Linki" /></div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase opacity-40 ml-4">SAAT</Label>
                      <Input type="time" value={editingBlock.time || '10:00'} onChange={(e) => setEditingBlock({...editingBlock, time: e.target.value, isManuallyEdited: true})} className="h-14 rounded-xl bg-slate-50 border-none shadow-inner px-6 font-black" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase opacity-40 ml-4">DURUM MÜHÜRÜ</Label>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingBlock({...editingBlock, status: 'planned'})} className={cn("flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest border-2", editingBlock.status === 'planned' ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-slate-100 text-primary/40")}>BEK</button>
                        <button onClick={() => setEditingBlock({...editingBlock, status: 'done'})} className={cn("flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest border-2", (editingBlock.status === 'done' || editingBlock.status === 'completed') ? "bg-emerald-500 text-white border-emerald-500 shadow-lg" : "bg-white border-slate-100 text-primary/40")}>OK</button>
                      </div>
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
                }} className="w-full h-20 rounded-[2.5rem] bg-primary hover:bg-accent text-white font-black text-xl uppercase tracking-[0.3em] gap-4 shadow-2xl transition-all">
                  TERMİNALE KAYDET <Save className="h-7 w-7 text-accent" />
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}