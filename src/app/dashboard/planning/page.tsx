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

const generateAdaptivePlan = (
  startDateStr: string,
  endDateStr: string,
  completedTopics: Record<string, string[]> = {},
  existingPlan: any[] = []
) => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO('2024-12-01'); 
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
      // DATA SHIELD: Protect completed, manually edited, or link-containing blocks
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

    // 10:00 - Main Subject (AYT after Dec 1)
    const p1Pool = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const p1Lessons = Object.keys(p1Pool);
    const p1L = p1Lessons[i % p1Lessons.length];
    dailyBlocks.push(getProtectedBlock('10:00', {
      lesson: p1L,
      topic: getNextTopic(p1L, p1Pool),
      examType: isAytStarted ? 'AYT' : 'TYT'
    }));

    // 11:00 - Secondary Subject (Always TYT)
    const p2Lessons = Object.keys(TYT_SOZEL_TOPICS);
    const p2L = p2Lessons[(i + 2) % p2Lessons.length];
    dailyBlocks.push(getProtectedBlock('11:00', {
      lesson: p2L,
      topic: getNextTopic(p2L, TYT_SOZEL_TOPICS),
      examType: 'TYT'
    }));

    // 12:00 - Strategic Review
    dailyBlocks.push(getProtectedBlock('12:00', {
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      examType: 'GENEL'
    }));

    // 15:00 - Paragraph
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

  const handleCreateProgram = async () => {
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
        title: "PROGRAM OLUŞTURULDU", 
        description: "Tüm tarihler tarandı, verileriniz korundu.",
        className: "bg-primary text-white rounded-2xl shadow-2xl"
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
      <div className="mx-auto w-full max-w-[1700px] px-4 py-8 md:px-10 space-y-12">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-4">
             <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-5 w-5" /></Button>
             </div>
             <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-accent/20"><Calendar className="h-3.5 w-3.5" /> TERMINAL 39.0</div>
                <h2 className="text-6xl font-black tracking-tighter text-primary italic uppercase leading-none">Akademik <br /><span className="text-accent">Planlama</span></h2>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-primary/5 w-full lg:w-auto">
             <div className="space-y-2 w-full md:w-auto">
                <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">BAŞLANGIÇ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-sm" />
             </div>
             <div className="space-y-2 w-full md:w-auto">
                <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">BİTİŞ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-sm" />
             </div>
             <Button onClick={handleCreateProgram} disabled={isRegenerating} className="h-14 px-10 rounded-2xl bg-primary hover:bg-accent text-white font-black text-xs uppercase tracking-widest gap-4 shadow-2xl transition-all w-full md:w-auto">
                {isRegenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 text-accent" />} PROGRAMI OLUŞTUR
             </Button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { label: 'TAMAMLANMA ORANI', val: `%${stats.rate}`, icon: CheckCircle2, color: 'text-emerald-500' },
             { label: 'TOPLAM GÖREV', val: stats.planned, icon: Target, color: 'text-primary' },
             { label: 'BEKLEYEN', val: stats.missing, icon: AlertCircle, color: 'text-accent' },
             { label: 'MÜFREDAT MODU', val: 'TM SÖZEL+', icon: Brain, color: 'text-indigo-500' },
           ].map((item, i) => (
             <Card key={i} className="p-10 rounded-[3.5rem] border-none bg-white shadow-xl group hover:scale-[1.02] transition-all">
                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-primary transition-all">
                   <item.icon className={cn("h-8 w-8 transition-colors group-hover:text-white", item.color)} />
                </div>
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-[0.2em] italic">{item.label}</p>
                <p className="text-5xl font-black text-primary italic tracking-tighter leading-none">{item.val}</p>
             </Card>
           ))}
        </div>

        {/* Timeline Content */}
        <div className="space-y-20">
          {filteredPlan.map((day: any) => (
            <div key={day.date} className="space-y-10">
               <div className="flex items-center gap-6 px-6">
                  <h3 className="text-4xl font-black italic tracking-tighter text-primary uppercase leading-none">{format(parseISO(day.date), 'd MMMM yyyy', { locale: tr })}</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <Badge className="bg-slate-100 text-primary font-black uppercase text-[10px] py-2 px-6 rounded-2xl border-none">{day.day}</Badge>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                  {day.blocks?.map((block: any) => {
                    const isDone = block.status === 'done';
                    return (
                      <Card 
                        key={block.id} 
                        className={cn(
                          "p-0 rounded-[4rem] border-none transition-all duration-500 group relative overflow-hidden bg-white flex flex-col shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-3",
                          isDone && "opacity-60"
                        )}
                      >
                         <div className={cn("h-2 w-full", isDone ? "bg-emerald-500" : "bg-primary")} />
                         <div className="p-10 space-y-8 flex-1 flex flex-col">
                            <div className="flex justify-between items-center">
                               <div className="px-4 py-2 rounded-xl bg-slate-50 text-[10px] font-black text-primary/40 border border-slate-100 italic">{block.time}</div>
                               <button onClick={() => handleTaskAction(block.id, day.date, 'done')} className={cn("px-5 py-2 rounded-xl text-[9px] font-black shadow-lg transition-all uppercase tracking-widest", isDone ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-accent")}>
                                 {isDone ? 'TAMAMLANDI' : 'MÜHÜRLE'}
                               </button>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-6 min-h-[140px]">
                              <h4 className={cn("text-3xl font-black text-center uppercase tracking-tight leading-[0.9] italic", isDone ? "text-slate-300 line-through" : "text-primary")}>
                                {block.topic}
                              </h4>
                            </div>
                            <div className="bg-[#F8FAFC] rounded-[3rem] p-8 space-y-6 shadow-inner border border-white">
                               <div className="flex justify-center gap-4">
                                  <a href={block.youtubeUrl || `https://www.youtube.com/results?search_query=${block.lesson}+${block.topic}`} target="_blank" className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-md", block.youtubeUrl ? "bg-rose-500 text-white scale-110" : "bg-slate-100 text-slate-300 hover:text-rose-500")}><Youtube className="h-6 w-6" /></a>
                                  <a href={block.mebiUrl || 'https://mebi.eba.gov.tr/'} target="_blank" className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-md", block.mebiUrl ? "bg-orange-500 text-white scale-110" : "bg-slate-100 text-slate-300 hover:text-orange-500")}><GraduationCap className="h-6 w-6" /></a>
                                  <a href={block.ebaUrl || 'https://www.eba.gov.tr/'} target="_blank" className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-md", block.ebaUrl ? "bg-blue-500 text-white scale-110" : "bg-slate-100 text-slate-300 hover:text-blue-500")}><School className="h-6 w-6" /></a>
                                  <a href={block.ogmUrl || 'https://ogmmateryal.eba.gov.tr/'} target="_blank" className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-md", block.ogmUrl ? "bg-emerald-500 text-white scale-110" : "bg-slate-100 text-slate-300 hover:text-emerald-500")}><BookOpen className="h-6 w-6" /></a>
                                  <a href={block.customLinkUrl || '#'} target="_blank" className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-md", block.customLinkUrl ? "bg-[#0F172A] text-white scale-110" : "bg-slate-100 text-slate-300 hover:text-primary")}><LinkIcon className="h-6 w-6" /></a>
                               </div>
                               <div className="flex gap-2">
                                  <Button onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="flex-1 h-12 rounded-2xl bg-white border border-slate-100 hover:bg-primary hover:text-white text-primary font-black uppercase text-[9px] gap-2 shadow-sm transition-all"><Edit3 className="h-4 w-4" /> DÜZENLE</Button>
                                  <button onClick={() => handleTaskAction(block.id, day.date, 'delete')} className="h-12 w-12 rounded-2xl bg-white text-slate-200 hover:bg-destructive hover:text-white transition-all flex items-center justify-center border border-slate-100 shadow-sm"><Trash2 className="h-5 w-5" /></button>
                               </div>
                            </div>
                         </div>
                      </Card>
                    );
                  })}
                  <button className="min-h-[300px] rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 hover:bg-accent/5 hover:border-accent transition-all group bg-white">
                     <Plus className="h-10 w-10 text-slate-100 group-hover:text-accent transition-colors" strokeWidth={3} />
                     <span className="text-[10px] font-black text-slate-200 group-hover:text-accent uppercase tracking-widest">GÖREV EKLE</span>
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[4rem] border-none shadow-2xl p-12 bg-white max-w-lg">
           <DialogHeader className="mb-6">
              <DialogTitle className="text-4xl font-black italic tracking-tighter text-primary uppercase">GÖREV <span className="text-accent">DÜZENLE</span></DialogTitle>
              <DialogDescription className="font-medium italic">Görevi ve kaynak linklerini güncelleyin.</DialogDescription>
           </DialogHeader>
           {editingBlock && (
             <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">GÖREV ADI</Label>
                  <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase opacity-40 ml-4">YOUTUBE</Label>
                      <Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none text-xs" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase opacity-40 ml-4">MEBİ</Label>
                      <Input value={editingBlock.mebiUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, mebiUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl bg-slate-50 border-none text-xs" />
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
                  toast({ title: 'Terminal Güncellendi', className: "bg-primary text-white rounded-2xl" });
                }} className="w-full h-20 rounded-[2.5rem] bg-primary hover:bg-accent text-white font-black text-sm uppercase tracking-widest shadow-2xl gap-4">
                  <Save className="h-6 w-6 text-accent" /> DEĞİŞİKLİKLERİ MÜHÜRLE
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}