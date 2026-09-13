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
  CheckCircle2, AlertCircle, Trash2, Link as LinkIcon, GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, parseISO, isBefore, isSameMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter } from 'date-fns';
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
import { generateAdaptivePlan } from '@/app/dashboard/page';

type ViewMode = 'annual' | 'monthly' | 'daily';

export default function PlanningPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  const { data: studyPlan, loading: planLoading } = useDoc<any>(user?.uid ? `studyPlans/${user.uid}` : null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
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
    
    const relevantPlan = studyPlan.masterPlan;
    const total = relevantPlan.reduce((acc: number, day: any) => acc + (day.blocks?.length || 0), 0);
    const done = relevantPlan.reduce((acc: number, day: any) => acc + (day.blocks?.filter((b: any) => b.status === 'done' || b.status === 'completed').length || 0), 0);
    
    return {
      planned: total,
      completed: done,
      missing: total - done,
      rate: Math.round((done / (total || 1)) * 100)
    };
  }, [studyPlan]);

  const handleTaskAction = async (blockId: string, dayDate: string, action: 'done' | 'delete') => {
    if (!db || !user || !studyPlan) return;
    
    const newPlan = studyPlan.masterPlan.map((day: any) => {
      if (day.date === dayDate) {
        return {
          ...day,
          blocks: day.blocks.map((b: any) => {
            if (b.id === blockId) {
              if (action === 'done') return { ...b, status: b.status === 'done' ? 'planned' : 'done' };
              if (action === 'delete') return null;
            }
            return b;
          }).filter(Boolean)
        };
      }
      return day;
    });

    await updateDoc(doc(db, 'studyPlans', user.uid), { 
      masterPlan: newPlan,
      updatedAt: serverTimestamp()
    });
    
    toast({ 
      title: action === 'done' ? 'Terminal Mühürlendi' : 'Blok İmha Edildi', 
      className: "bg-primary text-white rounded-2xl shadow-2xl"
    });
  };

  const handleRegeneratePlan = async () => {
    if (!db || !user || !userData) return;
    setIsRegenerating(true);
    try {
      const newPlan = generateAdaptivePlan(
        startDate, 
        userData.completedTopics || {}, 
        studyPlan?.masterPlan || []
      );
      await setDoc(doc(db, 'studyPlans', user.uid), {
        userId: user.uid,
        startDate: startDate,
        endDate: '2027-06-15',
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
    <div className="w-full bg-[#F8FAFC] min-h-screen">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-10 space-y-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="flex flex-col gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-5 w-5" /></Button>
               <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-5 w-5" /></Button>
            </div>
            <div className="space-y-2">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-primary font-black text-[9px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-accent/20"><Calendar className="h-3 w-3" /> COMMAND CENTER v46.0</div>
               <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black tracking-tighter italic text-primary uppercase leading-[0.8] text-shadow-premium break-words max-w-full">Akademik <br /><span className="text-accent text-shadow-accent">Terminal</span></h2>
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
               <Button onClick={handleRegeneratePlan} disabled={isRegenerating} className="h-12 px-6 rounded-xl bg-primary hover:bg-accent text-white font-black text-[9px] uppercase tracking-[0.2em] gap-2 shadow-2xl transition-all relative z-10 w-full sm:w-auto">
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
               <div className="flex gap-1.5 bg-white p-1.5 rounded-xl border border-primary/5 shadow-lg overflow-x-auto scrollbar-hide w-full">
                  {academicMonths.map((m, i) => (
                    <button key={i} onClick={() => { setSelectedMonth(m.date); setViewMode('monthly'); }} className={cn("h-9 min-w-[70px] px-3 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 shrink-0", isSameMonth(m.date, selectedMonth) && viewMode === 'monthly' ? "bg-primary text-white shadow-xl scale-105" : "bg-transparent text-primary/40 hover:bg-slate-50", m.isAyt && "text-accent")}>
                      {m.label.substring(0, 3)} {m.isAyt && <Zap className="h-2 w-2 fill-current" />}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 animate-in fade-in duration-700">
           {[
             { label: 'İLERLEME', val: `%${stats.rate}`, sub: 'YILLIK BAŞARI', color: 'primary', icon: Target },
             { label: 'PLANLANAN', val: stats.planned, sub: 'TOPLAM GÖREV', color: 'accent', icon: Calendar },
             { label: 'TAMAMLANAN', val: stats.completed, sub: 'MÜHÜRLENEN', color: 'primary', icon: CheckCircle2 },
             { label: 'EKSİK', val: stats.missing, sub: 'KRİTİK YOLLAR', color: 'accent', icon: AlertCircle },
             { label: 'DURUM', val: stats.rate > 70 ? 'STABİL' : 'RİSKLİ', sub: 'AI ANALİZİ', color: 'primary', icon: Brain },
           ].map((item, i) => (
             <Card key={i} className="p-5 sm:p-6 border border-primary/5 group relative overflow-hidden bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-lg">
                <div className="space-y-3 relative z-10">
                   <div className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-md", item.color === 'accent' ? 'bg-accent' : 'bg-primary')}>
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                   </div>
                   <div>
                      <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5 italic">{item.label}</p>
                      <p className="text-2xl sm:text-4xl font-black text-primary italic tracking-tighter">{item.val}</p>
                      <p className="text-[6px] font-bold text-muted-foreground/30 uppercase mt-0.5 tracking-widest">{item.sub}</p>
                   </div>
                </div>
             </Card>
           ))}
        </div>

        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {viewMode === 'annual' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {academicMonths.map((m, i) => {
                 const mStr = format(m.date, 'yyyy-MM');
                 const mData = studyPlan?.masterPlan?.filter((d: any) => d.date.startsWith(mStr)) || [];
                 const mTotal = mData.reduce((acc: number, day: any) => acc + (day.blocks?.length || 0), 0);
                 const mDone = mData.reduce((acc: number, day: any) => acc + (day.blocks?.filter((b: any) => b.status === 'done' || b.status === 'completed').length || 0), 0);
                 const mRate = Math.round((mDone / (mTotal || 1)) * 100);
                 return (
                  <Card key={i} onClick={() => { setSelectedMonth(m.date); setViewMode('monthly'); }} className="p-6 rounded-[2.5rem] bg-white border border-primary/5 shadow-lg group hover:scale-[1.02] transition-all cursor-pointer">
                     <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                           <span className="text-xl font-black text-primary italic tracking-tighter">{m.label}</span>
                           {m.isAyt && <Badge className="bg-accent text-primary font-black text-[7px] px-2 py-0.5 rounded-full">AYT</Badge>}
                        </div>
                        <span className="text-lg font-black text-accent">%{mRate}</span>
                     </div>
                     <Progress value={mRate} className="h-1.5 bg-slate-50" />
                     <div className="mt-3 flex justify-between text-[8px] font-black uppercase tracking-widest text-primary/30 italic"><span>{mDone} / {mTotal} GÖREV</span></div>
                  </Card>
                 );
               })}
            </div>
          ) : (
            <div className="space-y-12">
              {filteredPlan.map((day: any) => (
                <div key={day.date} className="space-y-8">
                   {day.date === '2026-12-01' && (
                      <Card className="p-8 rounded-[3rem] bg-accent text-primary border-none shadow-xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                         <div className="flex items-center gap-6 relative z-10">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center shadow-2xl shrink-0"><Target className="h-8 w-8 animate-pulse" /></div>
                            <div>
                               <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-1">01 ARALIK — MİLAT</p>
                               <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase leading-none">🎯 AYT PROGRAMI BAŞLADI</h3>
                               <p className="text-xs sm:text-sm font-bold italic opacity-60 mt-1">TYT çalışmalarına devam ederken AYT konu programı otonom olarak aktif hale geldi.</p>
                            </div>
                         </div>
                      </Card>
                   )}
                   <div className="flex items-center gap-4 sm:gap-6 px-2">
                      <h3 className="text-xl sm:text-3xl md:text-4xl font-black italic text-primary uppercase tracking-tighter">{format(parseISO(day.date), 'd MMMM yyyy', { locale: tr })}</h3>
                      <div className="h-px flex-1 bg-slate-200" />
                      <Badge variant="outline" className="h-8 sm:h-10 px-3 sm:px-4 rounded-xl font-black uppercase border-2 border-slate-100 text-primary text-[8px] sm:text-[10px]">{day.day}</Badge>
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
                             <div className="space-y-6 sm:space-y-8 relative z-10 flex-1 flex flex-col h-full overflow-hidden">
                                <div className="flex justify-between items-center">
                                   <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-[#FFF8E7] text-[#0F172A] flex items-center gap-1.5 sm:gap-2 border border-amber-100 shadow-sm">
                                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                                        <span className="text-[10px] sm:text-[12px] font-black">{block.time || '10:00'}</span>
                                      </div>
                                      <span className="text-[8px] sm:text-[10px] font-black text-primary/15 uppercase tracking-[0.3em] italic">#SÖZEL</span>
                                   </div>
                                   <Badge 
                                     onClick={() => handleTaskAction(block.id, day.date, 'done')}
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
                                     onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} 
                                     className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[#0F172A] text-white font-black uppercase text-[10px] sm:text-[11px] tracking-[0.3em] gap-2 sm:gap-3 shadow-2xl hover:bg-accent transition-all active:scale-95"
                                   >
                                     DÜZENLE <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                                   </Button>
                                   <Button 
                                     onClick={() => handleTaskAction(block.id, day.date, 'delete')} 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-md"
                                   >
                                     <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
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
          )}
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[3rem] sm:rounded-[4rem] border-none shadow-2xl p-6 sm:p-10 bg-white max-w-2xl overflow-hidden mx-4">
           <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4 sm:pb-6 mb-4 sm:mb-6">
              <div className="space-y-1 sm:space-y-2">
                <DialogTitle className="text-3xl sm:text-4xl font-black italic tracking-tighter text-primary uppercase leading-none">
                  GÖREV <span className="text-accent">DÜZENLE</span>
                </DialogTitle>
                <DialogDescription className="font-medium italic opacity-40 uppercase tracking-widest text-[8px] sm:text-[9px]">Akademik Terminal v46.0</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)} className="rounded-full h-8 w-8 sm:h-10 sm:w-10 bg-slate-50"><X className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
           </DialogHeader>
           {editingBlock && (
             <div className="space-y-6 sm:space-y-8 max-h-[75vh] overflow-y-auto px-1 pr-4 scrollbar-hide">
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2 sm:ml-4 italic text-primary">KONU / GÖREV ADI</Label>
                  <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-50 border-none font-bold text-base sm:text-lg px-6 sm:px-8 shadow-inner focus-visible:ring-accent" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                   <div className="space-y-3 sm:space-y-4">
                      <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-40 ml-2 sm:ml-4 italic">KONU ÇALIŞMA KAYNAKLARI</Label>
                      <div className="space-y-3 sm:space-y-4">
                         <div className="relative group">
                            <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 opacity-40" />
                            <Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-10 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 border-none pl-10 sm:pl-12 text-[10px] sm:text-xs font-bold" placeholder="YouTube URL" />
                         </div>
                         <div className="relative group">
                            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 opacity-40" />
                            <Input value={editingBlock.mebiUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, mebiUrl: e.target.value, isManuallyEdited: true})} className="h-10 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 border-none pl-10 sm:pl-12 text-[10px] sm:text-xs font-bold" placeholder="MEBİ URL" />
                         </div>
                         <div className="relative group">
                            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 opacity-40" />
                            <Input value={editingBlock.ogmKonuUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, ogmKonuUrl: e.target.value, isManuallyEdited: true})} className="h-10 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 border-none pl-10 sm:pl-12 text-[10px] sm:text-xs font-bold" placeholder="OGM Konu URL" />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-3 sm:space-y-4">
                      <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] opacity-40 ml-2 sm:ml-4 italic text-accent">TEST ÇÖZME KAYNAKLARI</Label>
                      <div className="space-y-3 sm:space-y-4">
                         <div className="relative group">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 opacity-40" />
                            <Input value={editingBlock.ogmTestUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, ogmTestUrl: e.target.value, isManuallyEdited: true})} className="h-10 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 border-none pl-10 sm:pl-12 text-[10px] sm:text-xs font-bold" placeholder="OGM Test URL" />
                         </div>
                         <div className="relative group">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                            <Input value={editingBlock.customLinkUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, customLinkUrl: e.target.value, isManuallyEdited: true})} className="h-10 sm:h-12 rounded-lg sm:rounded-xl bg-slate-50 border-none pl-10 sm:pl-12 text-[10px] sm:text-xs font-bold" placeholder="Özel Ders Linki URL" />
                         </div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                   <div className="space-y-2 sm:space-y-3">
                      <Label className="text-[9px] sm:text-[10px] font-bold uppercase opacity-40 ml-2 sm:ml-4">SAAT</Label>
                      <Input type="time" value={editingBlock.time || '10:00'} onChange={(e) => setEditingBlock({...editingBlock, time: e.target.value, isManuallyEdited: true})} className="h-12 sm:h-14 rounded-lg sm:rounded-xl bg-slate-50 border-none shadow-inner px-4 sm:px-6 font-black" />
                   </div>
                   <div className="space-y-2 sm:space-y-3">
                      <Label className="text-[9px] sm:text-[10px] font-bold uppercase opacity-40 ml-2 sm:ml-4">DURUM MÜHÜRÜ</Label>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingBlock({...editingBlock, status: 'planned'})} className={cn("flex-1 h-10 sm:h-12 rounded-lg sm:rounded-xl font-black uppercase text-[8px] sm:text-[9px] tracking-widest transition-all border-2", editingBlock.status === 'planned' ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-slate-100 text-primary/40")}>BEK</button>
                        <button onClick={() => setEditingBlock({...editingBlock, status: 'done'})} className={cn("flex-1 h-10 sm:h-12 rounded-lg sm:rounded-xl font-black uppercase text-[8px] sm:text-[9px] tracking-widest transition-all border-2", (editingBlock.status === 'done' || editingBlock.status === 'completed') ? "bg-emerald-500 text-white border-emerald-500 shadow-lg" : "bg-white border-slate-100 text-primary/40")}>OK</button>
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
                }} className="w-full h-16 sm:h-20 rounded-[2rem] sm:rounded-[2.5rem] bg-primary hover:bg-accent text-white font-black text-base sm:text-lg uppercase tracking-[0.3em] gap-3 sm:gap-4 shadow-2xl transition-all">
                  KAYDET <Save className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
