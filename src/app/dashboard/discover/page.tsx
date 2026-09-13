
'use client';

import { useUser, useCollection, useDoc, useFirestore } from '@/firebase';
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, Users, Star, ShieldCheck, GraduationCap, 
  Brain, Sparkles, Filter, ArrowRight, UserCheck,
  Target, Zap, MessageSquare, Compass, ShieldAlert,
  Hash, QrCode, CheckCircle2, Loader2, Home, ArrowLeft,
  Key, Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, addDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function DiscoverPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  
  const [search, setSearch] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Tüm öğretmenleri getir
  const { data: teachers = [], loading } = useCollection<any>('users', where('role', '==', 'teacher'));

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const s = search.toLocaleLowerCase('tr-TR');
    return teachers.filter(t => (t.displayName?.toLocaleLowerCase('tr-TR') || '').includes(s) || (t.branch?.toLocaleLowerCase('tr-TR') || '').includes(s));
  }, [teachers, search]);

  const handleSendRequest = async (teacherId: string, teacherName: string) => {
    if (!db || !user?.uid) return;
    try {
      await addDoc(collection(db, 'requests'), {
        studentId: user.uid,
        teacherId: teacherId,
        status: 'pending',
        message: `${userData?.displayName || 'Bir öğrenci'} sizinle akademik bağ kurmak istiyor.`,
        createdAt: serverTimestamp()
      });
      toast({ title: 'İstek Gönderildi', description: `${teacherName} hocamıza talebiniz iletildi.`, className: "bg-primary text-white rounded-2xl" });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata' });
    }
  };

  const handleConnectWithCode = async () => {
    if (!db || !user?.uid || !teacherCode.trim()) return;
    setIsConnecting(true);
    try {
      const q = query(collection(db, 'users'), where('activationCode', '==', teacherCode.trim()), where('role', '==', 'teacher'));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const teacher = snap.docs[0].data();
        await updateDoc(doc(db, 'users', user.uid), {
          teacherIds: arrayUnion(teacher.uid)
        });
        toast({ title: 'Bağlantı Başarılı', description: `${teacher.displayName} hocanızla eşleştiniz.`, className: "bg-emerald-500 text-white rounded-2xl" });
        setTeacherCode('');
        router.push('/dashboard');
      } else {
        toast({ variant: 'destructive', title: 'Hata', description: 'Geçersiz aktivasyon kodu.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-8 lg:p-14 space-y-12 max-w-7xl mx-auto w-full animate-in fade-in duration-1000 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
        <div className="space-y-4">
           <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><ArrowLeft className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"><Home className="h-5 w-5" /></Button>
           </div>
           <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic border border-accent/20"><Compass className="h-3.5 w-3.5" /> MENTOR DISCOVERY v43.0</div>
              <h2 className="text-6xl font-black tracking-tighter italic text-primary uppercase leading-none text-shadow-deep">Uzman <br /><span className="text-accent text-shadow-accent">Keşfet</span></h2>
           </div>
        </div>

        <Card className="p-8 rounded-[3rem] bg-white border-none shadow-2xl space-y-6 min-w-[350px]">
           <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center italic">KOD İLE HIZLI BAĞLAN</p>
           <div className="flex gap-4">
              <Input 
                value={teacherCode} 
                onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                placeholder="DK-XXXX" 
                className="h-14 rounded-xl bg-slate-50 border-none shadow-inner font-black tracking-widest text-center" 
              />
              <Button onClick={handleConnectWithCode} disabled={isConnecting} className="h-14 px-8 rounded-xl bg-primary hover:bg-accent text-white shadow-xl transition-all">
                {isConnecting ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5" />}
              </Button>
           </div>
        </Card>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
         <Card className="xl:col-span-4 p-10 rounded-[3.5rem] border-none shadow-xl bg-primary text-white space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform" />
            <Brain className="h-12 w-12 text-accent animate-pulse" />
            <div className="space-y-4 relative z-10">
               <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Neden Bir Mentor?</h3>
               <p className="text-sm font-bold italic opacity-60 leading-relaxed">Başarı sadece ders çalışmak değildir; doğru stratejiyi planlamaktır. Alanında uzman bir koç ile terminalini senkronize et, eksiklerini otonom olarak gidersin.</p>
            </div>
            <div className="space-y-4 pt-6 border-t border-white/10">
               <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-[10px] font-black uppercase tracking-widest">Kişiye Özel Analiz</span></div>
               <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-[10px] font-black uppercase tracking-widest">Anlık Mesajlaşma</span></div>
               <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><span className="text-[10px] font-black uppercase tracking-widest">KVKK Güvenli İletişim</span></div>
            </div>
         </Card>

         <div className="xl:col-span-8 space-y-10">
            <Card className="p-6 rounded-[2.5rem] border-none shadow-lg bg-white">
               <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20 group-focus-within:text-accent transition-colors" />
                  <Input 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="İsim veya uzmanlık alanı ara..." 
                    className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner pl-16 font-bold text-lg" 
                  />
               </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {filteredTeachers.map((t: any) => (
                 <Card key={t.uid} className="premium-card p-10 group relative overflow-hidden hover:-translate-y-2 transition-all">
                    <div className="space-y-8">
                       <div className="flex justify-between items-start">
                          <div className="h-20 w-20 rounded-[1.75rem] bg-slate-50 flex items-center justify-center text-primary font-black text-3xl italic shadow-inner border border-white">
                             {t.displayName?.charAt(0)}
                          </div>
                          <div className="flex items-center gap-1.5 text-accent font-black">
                             <Star className="h-4 w-4 fill-current" /> 5.0
                          </div>
                       </div>
                       <div>
                          <h4 className="text-2xl font-black text-primary italic uppercase tracking-tighter leading-none mb-2">{t.displayName}</h4>
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest italic opacity-60">{t.branch || 'AKADEMİK KOÇ'}</p>
                       </div>
                       <Button onClick={() => handleSendRequest(t.uid, t.displayName)} className="w-full h-14 rounded-2xl bg-primary hover:bg-accent text-white font-black text-[9px] uppercase tracking-widest gap-3 shadow-xl transition-all active:scale-95 group/btn">
                          MENTORLUK TALEBİ GÖNDER <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                       </Button>
                    </div>
                 </Card>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
