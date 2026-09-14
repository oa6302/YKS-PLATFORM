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
  Plus, RefreshCw
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

// --- TM SÖZEL MÜFREDAT VERİSİ (DİL BİLGİSİ VE GEOMETRİ HARİÇ) ---
const TM_SOZEL_CURRICULUM = {
  TYT_MATEMATIK: [
    'Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB-EKOK', 
    'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar', 
    'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran-Orantı', 'Denklem Çözme', 
    'Sayı Problemleri', 'Kesir Problemleri', 'Yaş Problemleri', 'İşçi Problemleri', 
    'Hız ve Hareket Problemleri', 'Yüzde, Kar ve Zarar Problemleri', 'Karışım Problemleri', 
    'Grafik Problemleri', 'Kümeler', 'Fonksiyonlar', 'Permütasyon - Kombinasyon', 
    'Olasılık', 'Veri ve İstatistik'
  ],
  TYT_TURKCE_ANLAM: [
    'Sözcükte Anlam', 'Söz Öbeklerinde Anlam', 'Cümlede Anlam', 'Cümlede Kavramlar',
    'Paragrafta Ana Düşünce', 'Paragrafta Yardımcı Düşünceler', 'Paragrafta Yapı', 
    'Paragraf Bölme', 'Paragraf Tamamlama', 'Düşünceyi Geliştirme Yolları', 'Anlatım Biçimleri', 'Sözel Mantık'
  ],
  SOSYAL: [
    'Tarih ve Zaman', 'İlk Çağ Uygarlıkları', 'İslam Tarihi', 'Türk-İslam Devletleri', 
    'Osmanlı Kuruluş ve Yükselme', 'Doğa ve İnsan', 'Dünya\'nın Şekli ve Hareketleri', 
    'Harita Bilgisi', 'Felsefe ile Tanışma', 'Bilgi Felsefesi', 'Bilgi ve İnanç'
  ],
  AYT_SOZEL: [
    'Edebiyat: Söz Sanatları', 'Edebiyat: Şiir Bilgisi', 'Edebiyat: İslamiyet Öncesi', 
    'Edebiyat: Halk Edebiyatı', 'Edebiyat: Divan Edebiyatı', 'Edebiyat: Tanzimat', 
    'AYT Tarih: Tarih Bilimi', 'AYT Tarih: Uygarlığın Doğuşu', 'AYT Coğrafya: Ekosistemler',
    'Felsefe Grubu: Psikolojiye Giriş', 'Felsefe Grubu: Sosyolojinin Alanı'
  ]
};

// --- ADAPTIVE GENERATION ENGINE WITH ZERO-LOSS PROTECTION ---
const generateAdaptivePlan = (
  startDateStr: string,
  endDateStr: string,
  existingPlan: any[] = []
) => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO('2026-12-01');
  const endDate = parseISO(endDateStr);
  const daysInterval = differenceInDays(endDate, startDate);

  if (daysInterval < 0) return existingPlan;

  const plan: any[] = [];
  const totalDays = daysInterval + 1;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayName = format(currentDate, 'EEEE', { locale: tr });
    const isAytStarted = !isBefore(currentDate, aytDate);
    
    // Check if we already have this day in existing plan
    const existingDay = existingPlan.find(d => d.date === dateStr);
    const dailyBlocks = [];

    // HELPER: Get protected block or generate new one
    const getBlock = (time: string, type: string, pool: string[]) => {
      const existing = existingDay?.blocks?.find((b: any) => b.time === time);
      
      // ZERO-LOSS RULE: If block is done, edited, or has links, KEEP IT
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

      // Otherwise, generate new content from pool
      const topicIndex = i % pool.length;
      return {
        id: `block_${dateStr}_${time.replace(':', '')}`,
        time,
        lesson: type,
        topic: pool[topicIndex],
        status: 'waiting',
        examType: type.includes('AYT') ? 'AYT' : 'TYT',
        isManuallyEdited: false
      };
    };

    // 10:00 - Main Topic (Math or AYT)
    const p1Pool = isAytStarted ? TM_SOZEL_CURRICULUM.AYT_SOZEL : TM_SOZEL_CURRICULUM.TYT_MATEMATIK;
    dailyBlocks.push(getBlock('10:00', isAytStarted ? 'AYT SÖZEL' : 'TYT MATEMATİK', p1Pool));

    // 11:00 - Secondary Topic (Social or Turkish)
    const p2Pool = i % 2 === 0 ? TM_SOZEL_CURRICULUM.SOSYAL : TM_SOZEL_CURRICULUM.TYT_TURKCE_ANLAM;
    dailyBlocks.push(getBlock('11:00', i % 2 === 0 ? 'SOSYAL' : 'TYT TÜRKÇE', p2Pool));

    // 12:00 - Review
    dailyBlocks.push(getBlock('12:00', 'TEKRAR', ['Dünün Kritik Kazanımları']));

    // 15:00 - Paragraf
    dailyBlocks.push(getBlock('15:00', 'KONDİSYON', ['20 Adet Paragraf Sorusu']));

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
    return studyPlan?.masterPlan || [];
  }, [studyPlan]);

  const stats = useMemo(() => {
    if (!studyPlan?.masterPlan) return { planned: 0, completed: 0, rate: 0 };
    let total = 0;
    let done = 0;
    studyPlan.masterPlan.forEach((day: any) => {
      day.blocks.forEach((b: any) => {
        total++;
        if (b.status === 'done') done++;
      });
    });
    return { planned: total, completed: done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
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
    toast({ title: "Terminal Güncellendi" });
  };

  const handleRegeneratePlan = async () => {
    if (!db || !user) return;
    setIsRegenerating(true);
    try {
      const currentPlan = studyPlan?.masterPlan || [];
      const newPlan = generateAdaptivePlan(startDate, endDate, currentPlan);
      await setDoc(doc(db, 'studyPlans', user.uid), {
        userId: user.uid,
        startDate: startDate,
        endDate: endDate,
        masterPlan: newPlan,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "RAPOR BAŞARIYLA ÇALIŞTIRILDI", description: "Mevcut verileriniz korundu, boşluklar dolduruldu." });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata' });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pb-20">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-12 space-y-12">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-200 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-6 w-6" /></Button>
               <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-200 hover:bg-primary hover:text-white transition-all"><Home className="h-6 w-6" /></Button>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-primary uppercase italic leading-none">
              Planlama <br /><span className="text-accent">Merkezi</span>
            </h1>
          </div>

          <Card className="p-6 rounded-[2rem] border-none shadow-xl bg-white flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-2">MİLAT</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase opacity-40 ml-2">FİNAL</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
            </div>
            <Button onClick={handleRegeneratePlan} disabled={isRegenerating} className="h-12 px-8 rounded-xl bg-primary hover:bg-accent text-white font-black text-xs uppercase tracking-widest gap-3 shadow-lg">
              {isRegenerating ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />} RAPORU ÇALIŞTIR
            </Button>
          </Card>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg text-center space-y-2">
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">İlerleme</p>
              <p className="text-5xl font-black text-primary italic">%{stats.rate}</p>
           </Card>
           <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg text-center space-y-2">
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Toplam Görev</p>
              <p className="text-5xl font-black text-primary italic">{stats.planned}</p>
           </Card>
           <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-lg text-center space-y-2">
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Tamamlanan</p>
              <p className="text-5xl font-black text-accent italic">{stats.completed}</p>
           </Card>
           <Card className="p-8 rounded-[2.5rem] bg-primary text-white border-none shadow-lg text-center space-y-2">
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Kalan</p>
              <p className="text-5xl font-black text-accent italic">{stats.planned - stats.completed}</p>
           </Card>
        </div>

        {/* PLAN FEED */}
        <div className="space-y-16">
          {filteredPlan.map((day: any) => (
            <div key={day.date} className="space-y-8">
              <div className="flex items-center gap-4">
                <h3 className="text-3xl font-black text-primary uppercase italic">{format(parseISO(day.date), 'd MMMM', { locale: tr })}</h3>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm font-black text-accent uppercase">{day.day}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {day.blocks.map((block: any) => (
                  <Card key={block.id} className={cn(
                    "min-h-[220px] rounded-[2rem] border-none shadow-lg p-6 flex flex-col justify-between transition-all hover:-translate-y-1 relative",
                    block.status === 'done' ? "bg-emerald-50/50 opacity-80" : "bg-white"
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] font-black">{block.time}</span>
                      </div>
                      <button 
                        onClick={() => handleTaskAction(block.id, day.date, 'done')}
                        className={cn("h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-md", block.status === 'done' ? "bg-emerald-500 text-white" : "bg-white text-slate-300")}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 mb-4">
                      <p className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">{block.lesson}</p>
                      <h4 className="text-xl font-black text-primary leading-tight uppercase italic">{block.topic}</h4>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        {block.youtubeUrl && <Youtube className="h-4 w-4 text-rose-500" />}
                        {block.mebiUrl && <GraduationCap className="h-4 w-4 text-emerald-500" />}
                        {block.customLinkUrl && <LinkIcon className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingBlock({...block, date: day.date}); setIsEditDialogOpen(true); }} className="h-8 w-8 rounded-lg bg-slate-50"><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleTaskAction(block.id, day.date, 'delete')} className="h-8 w-8 rounded-lg bg-slate-50 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {/* ADD BUTTON */}
                <button className="min-h-[220px] rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 hover:bg-accent/5 hover:border-accent transition-all group">
                   <Plus className="h-8 w-8 text-slate-300 group-hover:text-accent" />
                   <span className="text-[10px] font-black text-slate-400 group-hover:text-accent uppercase tracking-widest">GÖREV EKLE</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[3rem] p-10 bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-primary uppercase italic">Görevi Düzenle</DialogTitle>
          </DialogHeader>
          {editingBlock && (
            <div className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label>Konu / Görev Başlığı</Label>
                <Input value={editingBlock.topic} onChange={(e) => setEditingBlock({...editingBlock, topic: e.target.value, isManuallyEdited: true})} className="h-14 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>YouTube Linki</Label>
                  <Input value={editingBlock.youtubeUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, youtubeUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Özel Link</Label>
                  <Input value={editingBlock.customLinkUrl || ''} onChange={(e) => setEditingBlock({...editingBlock, customLinkUrl: e.target.value, isManuallyEdited: true})} className="h-12 rounded-xl" />
                </div>
              </div>
              <Button onClick={async () => {
                const newPlan = studyPlan.masterPlan.map((day: any) => {
                  if (day.date === editingBlock.date) {
                    return { ...day, blocks: day.blocks.map((b: any) => b.id === editingBlock.id ? { ...editingBlock } : b) };
                  }
                  return day;
                });
                await updateDoc(doc(db, 'studyPlans', user.uid), { masterPlan: newPlan, updatedAt: serverTimestamp() });
                setIsEditDialogOpen(false);
                toast({ title: "Güncellendi" });
              }} className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest">GÜNCELLE</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
