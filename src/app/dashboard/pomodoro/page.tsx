
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, Play, Pause, RotateCcw, Coffee, 
  Brain, Target, ArrowLeft, Home, Sparkles,
  Music, Volume2, Settings2, SkipForward, Headphones,
  Radio, Youtube, Plus, Edit3, Trash2, Save, X, Loader2
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, 
  doc, serverTimestamp, query, where, orderBy 
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_STREAMS = [
  { id: 'def1', videoId: 'tLqZk2mKz8U', title: 'RUHUN ŞİFASI - NEY SESİ', color: 'bg-emerald-600' },
  { id: 'def2', videoId: 'WPni755-Krg', title: 'ALPHA WAVES - DEEP FOCUS', color: 'bg-indigo-600' },
  { id: 'def3', videoId: 'mXndxY57wCI', title: 'PIANO STUDY - ZEN MODE', color: 'bg-amber-600' },
  { id: 'def4', videoId: '5qap5aO4i9A', title: 'LOFI GIRL - MASTER STUDY', color: 'bg-rose-500' },
];

export default function PomodoroPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [workMins, setWorkMinutes] = useState(25);
  const [breakMins, setBreakMinutes] = useState(5);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [focusGoal, setFocusGoal] = useState('DERİN ODAKLANMA MODU');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showMusic, setShowMusic] = useState(true);

  const streamsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'focusStreams'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'));
  }, [db, user]);

  const { data: dbStreams = [] } = useCollection<any>(streamsQuery);
  const streams = useMemo(() => dbStreams.length > 0 ? dbStreams : DEFAULT_STREAMS, [dbStreams]);

  const [selectedStream, setSelectedStream] = useState(streams[0]);

  useEffect(() => {
    if (streams.length > 0 && !streams.find(s => s.id === selectedStream?.id)) {
      setSelectedStream(streams[0]);
    }
  }, [streams, selectedStream?.id]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    const targetMins = mode === 'work' ? workMins : breakMins;
    setMinutes(targetMins);
    setSeconds(0);
  }, [mode, workMins, breakMins]);

  // Sonsuz döngüleri önlemek için bağımlılıklar rafine edildi
  useEffect(() => {
    if (!isActive) {
      const targetMins = mode === 'work' ? workMins : breakMins;
      setMinutes(targetMins);
      setSeconds(0);
    }
  }, [workMins, breakMins, mode, isActive]);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prevSeconds => {
          if (prevSeconds === 0) {
            if (minutes === 0) {
              clearInterval(interval);
              setIsActive(false);
              if (mode === 'work') {
                toast({
                  title: "SEANS TAMAMLANDI",
                  description: "HARİKA İŞ! ŞİMDİ ARA VER.",
                  className: "bg-accent text-primary rounded-[2rem] font-black border-none shadow-2xl"
                });
                setMode('break');
              } else {
                toast({
                  title: "MOLA BİTTİ",
                  description: "ZİHİN TAZELEME TAMAMLANDI. DERSE BAŞLA!",
                  className: "bg-primary text-white rounded-[2rem] font-black border-none shadow-2xl"
                });
                setMode('work');
              }
              return 0;
            } else {
              setMinutes(m => m - 1);
              return 59;
            }
          }
          return prevSeconds - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, minutes, mode, toast]);

  const handleStreamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !user) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const streamData = {
      title: (formData.get('title') as string).toUpperCase(),
      videoId: formData.get('videoId') as string,
      color: formData.get('color') as string || 'bg-primary',
      updatedAt: serverTimestamp(),
      userId: user.uid,
    };

    try {
      if (editingStream && !editingStream.id.startsWith('def')) {
        await updateDoc(doc(db, 'focusStreams', editingStream.id), streamData);
        toast({ title: 'Kanal Güncellendi', className: "bg-primary text-white rounded-2xl" });
      } else {
        await addDoc(collection(db, 'focusStreams'), {
          ...streamData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Yeni Kanal Eklendi', className: "bg-emerald-500 text-white rounded-2xl" });
      }
      setIsDialogOpen(false);
      setEditingStream(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStream = async (id: string) => {
    if (id.startsWith('def')) return;
    if (!db || !confirm('Bu kanalı kütüphaneden silmek istediğinize emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, 'focusStreams', id));
      toast({ title: 'Kanal Silindi', variant: 'destructive' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Silme işlemi başarısız.' });
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-14 space-y-12 max-w-[1600px] mx-auto w-full animate-in fade-in duration-1000 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-4 w-4" /></Button>
             <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-0.5">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-primary font-black text-[9px] uppercase tracking-[0.3em] shadow-lg shadow-accent/20 italic border border-accent/20">
                <Clock className="h-3 w-3" /> ODAKLANMA MOTORU V68.0
             </div>
             <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic text-primary uppercase leading-tight text-shadow-premium">
                POMODORO <br /><span className="text-accent text-shadow-accent">TERMİNALİ</span>
             </h2>
          </div>
        </div>

        <div className="flex gap-4">
           <Button 
             onClick={() => setShowMusic(!showMusic)}
             className={cn(
               "h-14 px-8 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.3em] gap-3 shadow-2xl",
               showMusic ? "bg-accent text-primary shadow-accent/20" : "bg-white text-primary border-2 border-slate-100 hover:bg-slate-50"
             )}
           >
              <Music className={cn("h-4 w-4", showMusic && "animate-bounce")} /> {showMusic ? 'MÜZİĞİ GİZLE' : 'ODAKLANMA MÜZİĞİ'}
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        <Card className="xl:col-span-7 p-10 md:p-16 rounded-[4.5rem] border-none shadow-[0_80px_160px_-40px_rgba(15,23,42,0.15)] bg-white text-center space-y-12 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-accent/10 transition-all duration-1000" />
           
           <div className="flex justify-center gap-4 relative z-10">
              <button 
                onClick={() => {setMode('work'); setIsActive(false);}}
                className={cn("px-8 md:px-12 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-500", mode === 'work' ? 'bg-[#0F172A] text-white shadow-2xl scale-105' : 'bg-slate-50 text-muted-foreground opacity-30 hover:opacity-100')}
              >ÇALIŞMA</button>
              <button 
                onClick={() => {setMode('break'); setIsActive(false);}}
                className={cn("px-8 md:px-12 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all duration-500", mode === 'break' ? 'bg-accent text-primary shadow-2xl scale-105' : 'bg-slate-50 text-muted-foreground opacity-30 hover:opacity-100')}
              >KISA MOLA</button>
           </div>

           <div className="relative z-10 flex items-center justify-center gap-4 overflow-hidden py-10">
              <p className="text-[8rem] sm:text-[10rem] md:text-[12rem] font-black italic tracking-tighter text-[#0F172A] leading-none text-shadow-premium">
                 {String(minutes).padStart(2, '0')}
              </p>
              <div className="flex flex-col gap-3 py-6 px-3 bg-accent rounded-full shadow-2xl shrink-0">
                 <div className="h-4 w-4 rounded-full bg-[#0F172A]" />
                 <div className="h-4 w-4 rounded-full bg-[#0F172A]" />
              </div>
              <p className="text-[8rem] sm:text-[10rem] md:text-[12rem] font-black italic tracking-tighter text-[#0F172A] leading-none text-shadow-premium">
                 {String(seconds).padStart(2, '0')}
              </p>
           </div>

           <div className="flex items-center justify-center gap-6 relative z-10">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <p className="text-[10px] font-black uppercase tracking-[0.6em] text-primary/20 italic whitespace-nowrap px-4">
                 {mode === 'work' ? focusGoal : 'ZİHİN TAZELEME MODU'}
              </p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
           </div>

           <div className="flex justify-center gap-8 relative z-10 pt-6">
              <Button 
                onClick={toggleTimer}
                className={cn(
                  "h-24 w-24 md:h-32 md:w-32 rounded-full shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group/play", 
                  isActive ? 'bg-slate-100 text-primary' : 'bg-[#0F172A] text-white'
                )}
              >
                 {isActive ? <Pause className="h-10 w-10 md:h-12 md:w-12" /> : <Play className="h-10 w-10 md:h-12 md:w-12 ml-2 fill-current group-hover/play:animate-pulse" />}
              </Button>
              <Button 
                onClick={resetTimer}
                variant="outline"
                className="h-24 w-24 md:h-32 md:w-32 rounded-full border-[6px] border-slate-50 bg-white text-muted-foreground hover:text-accent hover:border-accent transition-all duration-500 hover:scale-110 shadow-xl active:scale-95"
              >
                 <RotateCcw className="h-10 w-10 md:h-12 md:w-12" />
              </Button>
           </div>
        </Card>

        <div className="xl:col-span-5 space-y-10">
           <Card className="p-8 md:p-10 rounded-[3.5rem] border-none shadow-lg bg-white space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="flex items-center gap-5 relative z-10">
                 <div className="h-12 w-12 rounded-2xl bg-[#0F172A] flex items-center justify-center text-white shadow-xl"><Settings2 className="h-7 w-7 text-accent" /></div>
                 <h4 className="text-2xl font-black italic tracking-tighter uppercase text-primary">AYARLAR</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-8 relative z-10">
                 <div className="space-y-3 col-span-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 ml-4 italic">ODAK HEDEFİ</Label>
                    <div className="relative group">
                       <Target className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20 group-focus-within:text-accent transition-colors" />
                       <Input 
                         value={focusGoal} 
                         onChange={(e) => setFocusGoal(e.target.value.toUpperCase())}
                         className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner pl-14 font-black text-sm text-primary focus-visible:ring-accent transition-all" 
                         placeholder="ÖRN: MATEMATİK ÇALIŞMASI"
                       />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 ml-4 italic">ÇALIŞMA (DK)</Label>
                    <div className="relative group">
                       <Clock className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20 group-focus-within:text-accent transition-colors" />
                       <Input 
                         type="number" 
                         value={workMins} 
                         onChange={(e) => {
                            const val = Number(e.target.value);
                            setWorkMinutes(val);
                            if(!isActive && mode === 'work') setMinutes(val);
                         }}
                         className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner pl-14 font-black text-3xl text-primary focus-visible:ring-accent transition-all" 
                       />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 ml-4 italic">MOLA (DK)</Label>
                    <div className="relative group">
                       <Coffee className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20 group-focus-within:text-accent transition-colors" />
                       <Input 
                         type="number" 
                         value={breakMins} 
                         onChange={(e) => {
                            const val = Number(e.target.value);
                            setBreakMinutes(val);
                            if(!isActive && mode === 'break') setMinutes(val);
                         }}
                         className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner pl-14 font-black text-3xl text-primary focus-visible:ring-accent transition-all" 
                       />
                    </div>
                 </div>
              </div>
           </Card>

           {showMusic && (
              <Card className="p-8 md:p-10 rounded-[4rem] border-none shadow-3xl bg-[#0F172A] text-white space-y-8 animate-in slide-in-from-right-8 duration-700 relative overflow-hidden">
                 <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2" />
                 <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                       <Headphones className="h-7 w-7 text-accent animate-pulse" />
                       <h4 className="text-xl font-black italic tracking-[0.3em] uppercase">SESSEL ODAK</h4>
                    </div>
                    <Button 
                      size="icon" variant="ghost" 
                      onClick={() => { setEditingStream(null); setIsDialogOpen(true); }}
                      className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 text-accent transition-all"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                 </div>
                 
                 <div className="aspect-video w-full rounded-[2.5rem] bg-black/60 overflow-hidden relative shadow-3xl border border-white/5 group/video">
                    <iframe 
                      key={selectedStream?.videoId}
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${selectedStream?.videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
                      title="Lofi Radio"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      className="pointer-events-none opacity-40 group-hover/video:opacity-60 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                    <div className="absolute bottom-6 left-8 space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-accent italic">ŞU AN ÇALIYOR</p>
                       <p className="text-2xl font-black italic tracking-tighter uppercase line-clamp-1">{selectedStream?.title}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 relative z-10">
                    {streams.map((stream: any) => (
                       <div key={stream.id} className="relative group/btn-container">
                          <button 
                            onClick={() => setSelectedStream(stream)}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left w-full h-full",
                              selectedStream?.id === stream.id ? "bg-white text-primary border-white shadow-2xl scale-105" : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                          >
                             <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform shrink-0", stream.color || 'bg-primary')}>
                                <Youtube className="h-5 w-5" />
                             </div>
                             <span className="text-[9px] font-black uppercase tracking-widest line-clamp-2 italic">{stream.title}</span>
                          </button>
                          
                          {!stream.id.startsWith('def') && (
                            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/btn-container:opacity-100 transition-opacity z-20">
                               <Button 
                                 size="icon" variant="ghost" 
                                 onClick={(e) => { e.stopPropagation(); setEditingStream(stream); setIsDialogOpen(true); }}
                                 className="h-7 w-7 rounded-lg bg-white shadow-lg text-primary hover:bg-accent"
                               >
                                 <Edit3 className="h-3 w-3" />
                               </Button>
                               <Button 
                                 size="icon" variant="ghost" 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteStream(stream.id); }}
                                 className="h-7 w-7 rounded-lg bg-white shadow-lg text-destructive hover:bg-destructive hover:text-white"
                               >
                                 <Trash2 className="h-3 w-3" />
                               </Button>
                            </div>
                          )}
                       </div>
                    ))}
                 </div>
              </Card>
           )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[4rem] border-none shadow-2xl p-12 bg-white max-w-lg overflow-hidden">
           <DialogHeader className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest italic shadow-sm w-fit">
                <Music className="h-3 w-3 text-accent" /> SESSEL EDİTÖR
              </div>
              <DialogTitle className="text-4xl font-black italic tracking-tighter text-primary uppercase leading-none">
                {editingStream ? 'KANALI DÜZENLE' : 'YENİ KANAL EKLE'}
              </DialogTitle>
              <DialogDescription className="font-medium italic">YouTube linklerini terminale saniyeler içinde tescilleyin.</DialogDescription>
           </DialogHeader>

           <form onSubmit={handleStreamSubmit} className="space-y-8 pt-8">
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4 italic">KANAL BAŞLIĞI</Label>
                 <Input name="title" required defaultValue={editingStream?.title} placeholder="Örn: DERİN ÇALIŞMA FREKANSI" className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold" />
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4 italic">YOUTUBE VİDEO ID</Label>
                 <Input name="videoId" required defaultValue={editingStream?.videoId} placeholder="Örn: WPni755-Krg" className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold font-mono" />
                 <p className="text-[8px] font-bold text-muted-foreground ml-4 opacity-40 italic">Linkteki "v=" kısmından sonraki 11 karakter.</p>
              </div>
              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4 italic">KART RENGİ</Label>
                 <Select name="color" defaultValue={editingStream?.color || 'bg-primary'}>
                    <SelectTrigger className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner font-bold">
                       <SelectValue placeholder="Renk Seçin" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                       <SelectItem value="bg-primary" className="font-bold text-primary">Koyu Mavi</SelectItem>
                       <SelectItem value="bg-accent" className="font-bold text-accent">Altın Sarısı</SelectItem>
                       <SelectItem value="bg-rose-500" className="font-bold text-rose-500">Kırmızı</SelectItem>
                       <SelectItem value="bg-indigo-600" className="font-bold text-indigo-600">İndigo</SelectItem>
                       <SelectItem value="bg-emerald-600" className="font-bold text-emerald-600">Zümrüt Yeşili</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-20 rounded-[2rem] bg-primary hover:bg-accent transition-all font-black text-sm uppercase tracking-[0.4em] shadow-2xl text-white gap-4">
                 {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6 text-accent" />} TERMİNALE KAYDET
              </Button>
           </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
