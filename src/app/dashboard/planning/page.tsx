
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
  Plus, School, ExternalLink, ChevronRight, Library, Globe, PlusCircle, Search
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
import { TYT_SOZEL_TOPICS, AYT_SOZEL_TOPICS } from '@/lib/curriculum-data';

interface TaskLink {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'mebi' | 'eba' | 'ogm' | 'other';
}

/**
 * MASTER ADAPTIVE PLANNER v69.0
 */
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
      if (existing && (
        existing.status === 'done' || 
        existing.isManuallyEdited || 
        (existing.links && existing.links.length > 0)
      )) {
        return existing;
      }
      return { 
        id: `block_${dateStr}_${time.replace(':', '')}`, 
        time, 
        ...defaultData,
        startDate: dateStr,
        endDate: dateStr,
        status: 'waiting',
        links: [],
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

    const tytLessons = Object.keys(TYT_SOZEL_TOPICS);
    const p2L = tytLessons[(i + 2) % tytLessons.length];
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
  
  const [startDate, setStartDate] = useState('2026-09-14');
  const [endDate, setEndDate] = useState('2027-06-15');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');

  useEffect(() => {
    if (studyPlan?.startDate) setStartDate(studyPlan.startDate);
    if (studyPlan?.endDate) setEndDate(studyPlan.endDate);
  }, [studyPlan]);

  const filteredPlan = useMemo(() => {
    if (!studyPlan?.masterPlan) return [];
    return [...studyPlan.masterPlan].filter((d: any) => 
      !isBefore(parseISO(d.date), parseISO(startDate)) && 
      !isAfter(parseISO(d.date), parseISO(endDate))
    ).sort((a: any, b: any) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [studyPlan, startDate, endDate]);

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

  const handleAddLink = () => {
    if (!newLinkUrl) return;
    let type: TaskLink['type'] = 'other';
    if (newLinkUrl.includes('youtube.com') || newLinkUrl.includes('youtu.be')) type = 'youtube';
    else if (newLinkUrl.includes('mebi.eba.gov.tr')) type = 'mebi';
    else if (newLinkUrl.includes('eba.gov.tr')) type = 'eba';
    else if (newLinkUrl.includes('ogmmateryal')) type = 'ogm';

    const newLink: TaskLink = {
      id: Math.random().toString(36).substring(2, 9),
      title: newLinkTitle || (type === 'youtube' ? 'Video Ders' : type.toUpperCase()),
      url: newLinkUrl,
      type
    };

    setEditingBlock({
      ...editingBlock,
      links: [...(editingBlock.links || []), newLink],
      isManuallyEdited: true
    });
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const handleRemoveLink = (linkId: string) => {
    setEditingBlock({
      ...editingBlock,
      links: editingBlock.links.filter((l: TaskLink) => l.id !== linkId),
      isManuallyEdited: true
    });
  };

  const aiRecommendations = useMemo(() => {
    if (!editingBlock?.topic) return [];
    const topic = editingBlock.topic.toLowerCase();
    const recommendations: TaskLink[] = [
      { id: 'rec1', title: 'Konu Anlatımı Oynatma Listesi', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(editingBlock.topic)}+konu+anlatımı+oynatma+listesi`, type: 'youtube' },
      { id: 'rec2', title: 'MEBİ Konu Testleri', url: `https://mebi.eba.gov.tr/arama?q=${encodeURIComponent(editingBlock.topic)}`, type: 'mebi' },
      { id: 'rec3', title: 'ÖGM Materyal Çözümlü Sorular', url: `https://ogmmateryal.eba.gov.tr/soru-bankasi?q=${encodeURIComponent(editingBlock.topic)}`, type: 'ogm' }
    ];
    return recommendations;
  }, [editingBlock?.topic]);

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
        title: "PROGRAM SENKRONİZE EDİLDİ", 
        description: "Yıllık strateji terminale saniyeler içinde mühürlendi.",
        className: "bg-[#0F172A] text-white rounded-[2rem] shadow-2xl"
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata oluştu' });
    } finally {
      setIsRegenerating(false);
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

  return (
    <div className="p-8 lg:p-14 space-y-12 max-w-7xl mx-auto w-full animate-in fade-in duration-1000 bg-[#F8FAFC]">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
        <div className="space-y-4">
           <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-5 w-5" /></Button>
           </div>
           <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-primary/10"><Calendar className="h-3.5 w-3.5" /> OTONOM PLANLAYICI v69.0</div>
              <h2 className="text-6xl font-black tracking-tighter text-[#0F172A] italic uppercase leading-none text-shadow-deep">Akademik <br /><span className="text-accent text-shadow-accent">Terminal</span></h2>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-end gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-primary/5 w-full xl:w-auto">
           <div className="space-y-2 w-full md:w-auto">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">BAŞLANGIÇ</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-sm" />
           </div>
           <div className="space-y-2 w-full md:w-auto">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">BİTİŞ</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-sm" />
           </div>
           <Button onClick={handleCreateProgram} disabled={isRegenerating} className="h-14 px-10 rounded-2xl bg-primary hover:bg-accent text-white font-black text-[10px] uppercase tracking-widest gap-4 shadow-2xl transition-all w-full md:w-auto">
              {isRegenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 text-accent" />} PROGRAMI OLUŞTUR
           </Button>
        </div>
      </header>

      <div className="space-y-24">
        {filteredPlan.map((day: any) => (
          <div key={day.date} className="space-y-10">
             <div className="flex items-center gap-8 px-4">
                <h3 className="text-4xl font-black italic tracking-tighter text-[#0F172A] uppercase leading-none">{format(parseISO(day.date), 'd MMMM yyyy', { locale: tr })}</h3>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30 italic">{day.day}</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {day.blocks?.map((block: any) => {
                  const isDone = block.status === 'done';
                  return (
                    <Card 
                      key={block.id} 
                      className={cn(
                        "min-h-[550px] p-0 rounded-[3rem] border-none transition-all duration-500 group relative overflow-hidden bg-white flex flex-col shadow-lg hover:-translate-y-2 hover:shadow-2xl",
                        isDone && "opacity-60"
                      )}
                    >
                       <div className={cn("h-1.5 w-full", isDone ? "bg-emerald-500" : "bg-primary")} />
                       <div className="p-8 space-y-8 flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                             <div className="px-4 py-2 rounded-xl bg-slate-50 text-[9px] font-black text-primary/40 border border-slate-100 italic">{block.time}</div>
                             <button onClick={() => handleTaskAction(block.id, day.date, 'done')} className={cn("px-4 py-2 rounded-xl text-[8px] font-black shadow-lg transition-all uppercase tracking-widest", isDone ? "bg-emerald-500 text-white" : "bg-[#0F172A] text-white hover:bg-accent")}>
                               {isDone ? 'TAMAMLANDI' : 'MÜHÜRLE'}
                             </button>
                          </div>
                          
                          <div className="space-y-4 text-center">
                            <h4 className={cn("text-3xl font-black uppercase tracking-tight leading-[0.95] italic line-clamp-3 min-h-[85px]", isDone ? "text-slate-300 line-through" : "text-[#0F172A]")}>
                              {block.topic}
                            </h4>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">{block.lesson}</p>
                          </div>

                          <div className="bg-[#F8FAFC] rounded-[2.5rem] p-6 space-y-4 shadow-inner border border-white flex-1 overflow-y-auto max-h-[180px] scrollbar-hide">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 italic">KAYNAK LİNKLERİ</span>
                               <Zap className="h-3 w-3 text-accent animate-pulse" />
                             </div>
                             <div className="grid gap-2">
                                {block.links?.map((link: TaskLink) => (
                                  <a key={link.id} href={link.url} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-50 hover:border-accent transition-all group/link">
                                     <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                        {getLinkIcon(link.type)}
                                     </div>
                                     <span className="text-[10px] font-bold text-primary/70 truncate uppercase">{link.title}</span>
                                     <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover/link:opacity-40 transition-opacity" />
                                  </a>
                                ))}
                                {(!block.links || block.links.length === 0) && (
                                  <p className="text-[9px] text-center italic opacity-20 py-4">Link bulunamadı</p>
                                )}
                             </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                             <Button onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="flex-1 h-12 rounded-xl bg-white border-2 border-slate-50 hover:bg-primary hover:text-white text-primary font-black uppercase text-[9px] gap-2 shadow-sm transition-all"><Edit3 className="h-4 w-4 text-accent" /> DÜZENLE</Button>
                             <button onClick={() => handleTaskAction(block.id, day.date, 'delete')} className="h-12 w-12 rounded-xl bg-white text-slate-200 hover:bg-destructive hover:text-white transition-all flex items-center justify-center border-2 border-slate-50 shadow-sm"><Trash2 className="h-5 w-5" /></button>
                          </div>
                       </div>
                    </Card>
                  );
                })}
                <button className="min-h-[550px] rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6 hover:bg-accent/5 hover:border-accent transition-all group bg-white">
                   <Plus className="h-12 w-12 text-slate-100 group-hover:text-accent" strokeWidth={3} />
                   <span className="text-[12px] font-black text-slate-200 group-hover:text-accent uppercase tracking-[0.3em]">GÖREV EKLE</span>
                </button>
             </div>
          </div>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[4rem] border-none shadow-2xl p-0 bg-white max-w-4xl overflow-hidden flex flex-col">
           <div className="grid lg:grid-cols-[1fr_320px] flex-1 min-h-[700px]">
              <div className="p-12 space-y-10 overflow-y-auto max-h-[85vh] scrollbar-hide">
                 <DialogHeader className="mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest italic border border-primary/10 w-fit mb-4">
                      <Sparkles className="h-3.5 w-3.5 text-accent" /> AOS EDITOR v69.0
                    </div>
                    <DialogTitle className="text-6xl font-black italic tracking-tighter text-primary uppercase leading-[0.85]">GÖREV <br /><span className="text-accent">TERMİNALİ</span></DialogTitle>
                    <DialogDescription className="font-medium italic opacity-60 text-lg">Görevi, tarih aralığını ve sınırsız kaynağı yönetin.</DialogDescription>
                 </DialogHeader>

                 {editingBlock && (
                   <div className="space-y-12">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">GÖREV BAŞLIĞI</Label>
                        <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-20 rounded-[2.25rem] bg-slate-50 border-none shadow-inner font-black text-3xl px-8 focus-visible:ring-accent" />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">BAŞLANGIÇ TARİHİ</Label>
                            <Input type="date" value={editingBlock.startDate || editingBlock.date} onChange={(e) => setEditingBlock({...editingBlock, startDate: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-sm" />
                         </div>
                         <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-4 italic">BİTİŞ TARİHİ</Label>
                            <Input type="date" value={editingBlock.endDate || editingBlock.date} onChange={(e) => setEditingBlock({...editingBlock, endDate: e.target.value, isManuallyEdited: true})} className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold text-sm" />
                         </div>
                      </div>

                      <div className="space-y-8 bg-[#F8FAFC] rounded-[3rem] p-8 border border-slate-100 shadow-inner">
                         <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-2 italic">YENİ KAYNAK EKLE</Label>
                            <PlusCircle className="h-4 w-4 text-accent" />
                         </div>
                         <div className="flex flex-col gap-4">
                            <Input value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Kaynak Adı (Örn: Paragraf Taktikleri)" className="h-14 rounded-2xl bg-white border-2 border-slate-50 font-bold" />
                            <div className="flex gap-3">
                               <Input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="URL (YouTube, MEBİ, EBA...)" className="flex-1 h-14 rounded-2xl bg-white border-2 border-slate-50 font-bold" />
                               <Button onClick={handleAddLink} className="h-14 w-14 rounded-2xl bg-primary hover:bg-accent text-white shadow-xl">
                                  <Plus className="h-6 w-6" />
                               </Button>
                            </div>
                         </div>

                         <div className="space-y-3 pt-6 border-t border-slate-200">
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary/30 ml-2">EKLENEN KAYNAKLAR</span>
                            <div className="grid gap-3">
                               {editingBlock.links?.map((link: TaskLink) => (
                                 <div key={link.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-50 shadow-sm group">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                       {getLinkIcon(link.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-[11px] font-black text-primary truncate uppercase">{link.title}</p>
                                       <p className="text-[8px] text-muted-foreground truncate opacity-40">{link.url}</p>
                                    </div>
                                    <button onClick={() => handleRemoveLink(link.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-slate-300 hover:text-destructive transition-all">
                                       <Trash2 className="h-4 w-4" />
                                    </button>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="bg-slate-50 p-10 border-l border-primary/5 space-y-10 flex flex-col justify-between">
                 <div className="space-y-10">
                    <Card className="rounded-[2.5rem] border-none bg-primary text-white p-8 space-y-6 relative overflow-hidden group shadow-2xl">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[60px] rounded-full translate-x-1/2 -translate-y-1/2" />
                       <div className="flex items-center gap-3 relative z-10"><Brain className="h-5 w-5 text-accent animate-pulse" /><span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 italic">AI KAYNAK ÖNERİLERİ</span></div>
                       
                       <div className="space-y-3 relative z-10">
                          {aiRecommendations.map(rec => (
                            <button 
                              key={rec.id} 
                              onClick={() => {
                                setEditingBlock({
                                  ...editingBlock,
                                  links: [...(editingBlock.links || []), { ...rec, id: Math.random().toString(36).substring(2, 9) }],
                                  isManuallyEdited: true
                                });
                                toast({ title: 'AI Önerisi Eklendi' });
                              }}
                              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/5 hover:bg-white/20 transition-all text-left group/rec"
                            >
                               <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                  {getLinkIcon(rec.type)}
                               </div>
                               <span className="text-[9px] font-bold uppercase tracking-tight line-clamp-2">{rec.title}</span>
                               <PlusCircle className="h-4 w-4 ml-auto opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                            </button>
                          ))}
                       </div>
                    </Card>

                    <div className="p-8 bg-white rounded-[2.5rem] border border-primary/5 shadow-inner text-center space-y-2">
                       <p className="text-[9px] font-black uppercase text-primary/30 italic">KAZANIM TAHMİNİ</p>
                       <p className="text-4xl font-black text-primary italic tracking-tighter text-shadow-sm">+50 XP</p>
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
                   toast({ title: 'Terminal Mühürlendi', className: "bg-[#0F172A] text-white rounded-2xl shadow-2xl" });
                 }} className="w-full h-24 rounded-[2.5rem] bg-[#0F172A] hover:bg-accent text-white font-black text-sm uppercase tracking-[0.4em] shadow-2xl gap-6 transition-all active:scale-95 group/save">
                   <Save className="h-7 w-7 text-accent group-hover/save:animate-bounce" /> KAYDET
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

