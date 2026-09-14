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
import { format, parseISO, isBefore, isAfter, addDays, differenceInDays } from 'date-fns';
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

/**
 * @fileOverview YKS TM Sözel Master - Planning Page
 * v39 Ultra Modern Design & Omni-Sync Logic
 */

const generateAdaptivePlan = (
  startDateStr: string,
  endDateStr: string,
  completedTopics: Record<string, string[]> = {},
  existingPlan: any[] = []
) => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO('2024-12-01'); // 2024 için güncellendi
  const endDate = parseISO(endDateStr);
  const daysInterval = differenceInDays(endDate, startDate);

  if (daysInterval < 0) return existingPlan;

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
    const dailyBlocks: any[] = [];

    const getProtectedBlock = (time: string, defaultData: any) => {
      const existing = existingDay?.blocks?.find((b: any) => b.time === time);
      // DATA SHIELD: Protect completed or manually modified blocks
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

    // 10:00 - Ana Branş
    const p1Pool = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const p1Lessons = Object.keys(p1Pool);
    const p1L = p1Lessons[i % p1Lessons.length];
    dailyBlocks.push(getProtectedBlock('10:00', {
      lesson: p1L,
      topic: getNextTopic(p1L, p1Pool),
      examType: isAytStarted ? 'AYT' : 'TYT'
    }));

    // 11:00 - İkinci Branş
    const p2Lessons = Object.keys(TYT_SOZEL_TOPICS);
    const p2L = p2Lessons[(i + 2) % p2Lessons.length];
    dailyBlocks.push(getProtectedBlock('11:00', {
      lesson: p2L,
      topic: getNextTopic(p2L, TYT_SOZEL_TOPICS),
      examType: 'TYT'
    }));

    // 12:00 - Stratejik Tekrar
    dailyBlocks.push(getProtectedBlock('12:00', {
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      examType: 'GENEL'
    }));

    // 15:00 - Paragraf
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
  
  const [startDate, setStartDate] = useState('2024-09-01');
  const [endDate, setEndDate] = useState('2025-06-15');
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
    ).sort((a: any, b: any) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [studyPlan, startDate, endDate]);

  const stats = useMemo(() => {
    if (!studyPlan?.masterPlan) return { planned: 0, completed: 0, missing: 0, rate: 0 };
    const total = studyPlan.masterPlan.length * 4;
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
      toast({ 
        title: "DİNAMİK SENKRONİZASYON TAMAMLANDI", 
        description: "Verileriniz korundu, takvim güncellendi.",
        className: "bg-[#0F172A] text-white border-accent/20 rounded-2xl"
      });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Hata oluştu' });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pb-20">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-12 space-y-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-4">
             <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-5 w-5" /></Button>
             </div>
             <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic"><Calendar className="h-3.5 w-3.5" /> TERMINAL 39.0</div>
                <h2 className="text-6xl font-bold tracking-tighter text-[#0F172A] uppercase leading-none">Akademik <br /><span className="text-accent">Planlama</span></h2>
             </div>
          </div>

          <div className="flex flex-col gap-4 w-full lg:w-auto">
             <div className="flex flex-wrap gap-4 items-end bg-white p-6 rounded-[2.5rem] shadow-xl border border-primary/5">
                <div className="space-y-2">
                   <Label className="text-[9px] font-black uppercase opacity-40 ml-2 italic">BAŞLANGIÇ</Label>
                   <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[9px] font-black uppercase opacity-40 ml-2 italic">BİTİŞ</Label>
                   <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <Button onClick={handleRegeneratePlan} disabled={isRegenerating} className="h-12 px-8 rounded-xl bg-[#0F172A] hover:bg-accent text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-2xl transition-all">
                   {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-accent" />} RAPORU ÇALIŞTIR
                </Button>
             </div>
          </div>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {[
             { label: 'TAMAMLANAN', val: `%${stats.rate}`, icon: CheckCircle2 },
             { label: 'AKTİF GÖREV', val: stats.planned, icon: Target },
             { label: 'KALAN', val: stats.missing, icon: AlertCircle },
             { label: 'STRATEJİ', val: stats.rate > 70 ? 'STABİL' : 'DÜŞÜK', icon: Brain },
           ].map((item, i) => (
             <Card key={i} className="p-8 rounded-[2.5rem] border-none bg-white shadow-lg border border-primary/5 group">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-accent transition-all">
                   <item.icon className="h-6 w-6 text-primary group-hover:text-white" />
                </div>
                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 tracking-widest">{item.label}</p>
                <p className="text-4xl font-bold text-primary tracking-tighter leading-none">{item.val}</p>
             </Card>
           ))}
        </div>

        {/* Timeline */}
        <div className="space-y-16">
          {filteredPlan.map((day: any) => (
            <div key={day.date} className="space-y-8">
               <div className="flex items-center gap-6 px-4">
                  <h3 className="text-3xl font-bold text-[#0F172A] uppercase tracking-tighter">{format(parseISO(day.date), 'd MMMM yyyy', { locale: tr })}</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <Badge className="bg-slate-100 text-primary font-black uppercase text-[10px] py-2 px-4 rounded-xl">{day.day}</Badge>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {day.blocks?.map((block: any) => {
                    const isDone = block.status === 'done';
                    return (
                      <Card 
                        key={block.id} 
                        className={cn(
                          "p-0 rounded-[3rem] border-none transition-all duration-500 group relative overflow-hidden bg-white flex flex-col shadow-xl hover:-translate-y-2",
                          isDone && "opacity-60"
                        )}
                      >
                         <div className={cn("h-1.5 w-full", isDone ? "bg-emerald-500" : "bg-primary")} />
                         <div className="p-8 space-y-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-center">
                               <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-[10px] font-black text-primary/40 border border-slate-100">{block.time}</div>
                               <button onClick={() => handleTaskAction(block.id, day.date, 'done')} className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black shadow-md transition-all uppercase", isDone ? "bg-emerald-500 text-white" : "bg-[#FF4D6D] text-white hover:bg-accent")}>
                                 {isDone ? 'TAMAMLANDI' : 'BEKLİYOR'}
                               </button>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-6 min-h-[120px]">
                              <h4 className={cn("text-2xl font-bold text-center uppercase tracking-tight leading-tight", isDone ? "text-slate-300 line-through" : "text-[#0F172A]")}>
                                {block.topic}
                              </h4>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-[2rem] p-5 space-y-5 shadow-inner">
                               <div className="flex justify-center gap-4">
                                  {block.youtubeUrl && <a href={block.youtubeUrl} target="_blank" className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center hover:scale-110 transition-all shadow-sm"><Youtube className="h-5 w-5 text-rose-500" /></a>}
                                  {block.mebiUrl && <a href={block.mebiUrl} target="_blank" className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center hover:scale-110 transition-all shadow-sm"><GraduationCap className="h-5 w-5 text-orange-500" /></a>}
                                  {block.ebaUrl && <a href={block.ebaUrl} target="_blank" className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center hover:scale-110 transition-all shadow-sm"><School className="h-5 w-5 text-blue-500" /></a>}
                                  {block.ogmUrl && <a href={block.ogmUrl} target="_blank" className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center hover:scale-110 transition-all shadow-sm"><BookOpen className="h-5 w-5 text-emerald-500" /></a>}
                                  {block.customLinkUrl && <a href={block.customLinkUrl} target="_blank" className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center hover:scale-110 transition-all shadow-sm"><LinkIcon className="h-5 w-5 text-primary" /></a>}
                               </div>
                               <div className="flex gap-2">
                                  <Button onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="flex-1 h-10 rounded-xl bg-white border border-slate-100 hover:bg-primary hover:text-white text-primary font-black uppercase text-[9px] gap-2 shadow-sm transition-all"><Edit3 className="h-4 w-4" /> DÜZENLE</Button>
                                  <button onClick={() => handleTaskAction(block.id, day.date, 'delete')} className="h-10 w-10 rounded-xl bg-white text-slate-200 hover:bg-destructive hover:text-white transition-all flex items-center justify-center border border-slate-100 shadow-sm"><Trash2 className="h-4 w-4" /></button>
                               </div>
                            </div>
                         </div>
                      </Card>
                    );
                  })}
                  <button className="min-h-[280px] rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 hover:bg-accent/5 hover:border-accent transition-all group bg-white">
                     <Plus className="h-10 w-10 text-slate-100 group-hover:text-accent transition-colors" strokeWidth={3} />
                     <span className="text-[10px] font-black text-slate-200 group-hover:text-accent uppercase tracking-widest">GÖREV EKLE</span>
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[4rem] border-none shadow-2xl p-12 bg-white max-w-lg">
           <DialogHeader className="space-y-4">
              <DialogTitle className="text-4xl font-black italic tracking-tighter text-primary uppercase leading-none">GÖREVİ <span className="text-accent">REVİZE ET</span></DialogTitle>
              <DialogDescription className="font-medium italic">Kişisel kaynaklarını ve başlığı güncelleyin.</DialogDescription>
           </DialogHeader>
           {editingBlock && (
             <div className="space-y-8 pt-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">KONU / GÖREV ADI</Label>
                  <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <Label className="text-[9px] font-black uppercase opacity-40 ml-4">YOUTUBE URL</Label>
                      <Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-14 rounded-xl bg-slate-50 border-none text-xs" placeholder="https://..." />
                   </div>
                   <div className="space-y-3">
                      <Label className="text-[9px] font-black uppercase opacity-40 ml-4">ÖZEL KAYNAK</Label>
                      <Input value={editingBlock.customLinkUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, customLinkUrl: e.target.value, isManuallyEdited: true})} className="h-14 rounded-xl bg-slate-50 border-none text-xs" placeholder="https://..." />
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
                  toast({ title: 'Değişiklikler Mühürlendi', className: "bg-primary text-white rounded-2xl" });
                }} className="w-full h-20 rounded-[2.5rem] bg-primary hover:bg-accent text-white font-black text-sm uppercase tracking-[0.4em] shadow-2xl gap-4">
                  <Save className="h-6 w-6 text-accent" /> GÜNCELLEMEYİ KAYDET
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
