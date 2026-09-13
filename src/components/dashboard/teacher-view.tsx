
'use client';

import { useCollection, useFirestore } from '@/firebase';
import {
  Users,
  School,
  Plus,
  Copy,
  Brain,
  LayoutDashboard,
  Sparkles,
  BookOpenCheck,
  Loader2,
  Save,
  Trash2,
  Edit3,
  Layers,
  Eye,
  Key,
  TrendingUp,
  MessageSquare,
  Settings,
  Search,
  UserRound,
  ArrowRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { collection, doc, setDoc, query, where, orderBy, serverTimestamp, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

export function TeacherView({ user, userData }: { user: any; userData: any }) {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const [studentSearch, setStudentSearch] = useState('');

  // Bağlı öğrenciler (Firestore query)
  const { data: students = [] } = useCollection<any>(
    'users',
    where('role', '==', 'student'),
    where('teacherIds', 'array-contains', user?.uid || '')
  );

  // Bekleyen bağlantı istekleri
  const { data: requests = [] } = useCollection<any>(
    'requests',
    where('teacherId', '==', user?.uid || ''),
    where('status', '==', 'pending')
  );

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const search = studentSearch.toLocaleLowerCase('tr-TR');
    return students.filter(s => 
      (s.displayName?.toLocaleLowerCase('tr-TR') || '').includes(search) || 
      (s.email?.toLocaleLowerCase('tr-TR') || '').includes(search)
    );
  }, [students, studentSearch]);

  const handleAcceptRequest = async (request: any) => {
    if (!db) return;
    try {
      // İstek durumunu güncelle
      await updateDoc(doc(db, 'requests', request.id), { status: 'accepted', updatedAt: serverTimestamp() });
      
      // Öğrenciye öğretmeni ekle
      await updateDoc(doc(db, 'users', request.studentId), {
        teacherIds: arrayUnion(user.uid)
      });

      toast({ title: 'Bağlantı Kuruldu', description: 'Öğrenci başarıyla kadronuza eklendi.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata' });
    }
  };

  const openStudentSimulation = (studentId: string) => {
    router.push(`/dashboard?simulate=${encodeURIComponent(studentId)}`);
  };

  const openChat = (studentId: string) => {
    router.push(`/dashboard/messages?with=${encodeURIComponent(studentId)}`);
  };

  return (
    <div className="p-8 lg:p-14 space-y-12 max-w-7xl mx-auto w-full animate-in fade-in duration-1000">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-2xl">
            <Sparkles className="h-4 w-4 text-accent animate-pulse" /> MENTOR COMMAND CENTER v43.0
          </div>
          <h2 className="text-6xl font-black tracking-tighter italic text-primary uppercase text-shadow-premium leading-none">
            Akademik <br /><span className="text-accent text-shadow-accent">Karargah</span>
          </h2>
        </div>
        
        <Card className="bg-white rounded-[2.5rem] p-8 border-none shadow-xl flex items-center gap-8 group">
           <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-all">
              <Key className="h-8 w-8 text-primary" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/30 italic">DAVET KODUNUZ</p>
              <p className="text-3xl font-black tracking-[0.3em] font-mono text-primary">{userData?.activationCode || '---'}</p>
           </div>
           <Button onClick={() => {navigator.clipboard.writeText(userData?.activationCode); toast({title: "Kopyalandı"});}} variant="ghost" size="icon" className="h-12 w-12 rounded-xl hover:bg-accent hover:text-white transition-all">
              <Copy className="h-6 w-6" />
           </Button>
        </Card>
      </header>

      <Tabs defaultValue="students" className="space-y-10">
        <TabsList className="bg-white/50 backdrop-blur-xl p-2 rounded-[2.5rem] h-20 shadow-xl border border-white flex gap-2">
          <TabsTrigger value="students" className="rounded-[2rem] px-10 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white gap-3">
             <Users className="h-4 w-4" /> ÖĞRENCİLERİM
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-[2rem] px-10 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white gap-3 relative">
             <MessageSquare className="h-4 w-4" /> TALEPLER
             {requests.length > 0 && <span className="absolute -top-1 -right-1 h-6 w-6 bg-accent text-primary rounded-full flex items-center justify-center text-[10px] font-black border-4 border-[#F8FAFC]">{requests.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <Card className="p-6 rounded-[2.5rem] border-none shadow-lg bg-white">
              <div className="relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20 group-focus-within:text-accent transition-colors" />
                 <Input 
                   value={studentSearch} 
                   onChange={(e) => setStudentSearch(e.target.value)}
                   placeholder="Öğrenci ismi veya e-posta ile ara..." 
                   className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner pl-16 font-bold text-lg" 
                 />
              </div>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredStudents.map((s: any) => (
                <Card key={s.uid} className="premium-card p-10 group relative overflow-hidden flex flex-col justify-between h-[450px]">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-accent/10 transition-all" />
                   
                   <div className="space-y-8 relative z-10">
                      <div className="flex justify-between items-start">
                         <div className="h-24 w-24 rounded-[2.25rem] bg-primary flex items-center justify-center text-white font-black text-4xl italic shadow-2xl border-[6px] border-white group-hover:scale-105 transition-all">
                            {s.displayName?.charAt(0)}
                         </div>
                         <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-sm">%{s.successRate || 85} AI SKOR</Badge>
                      </div>
                      <div>
                         <h4 className="text-3xl font-black text-primary italic uppercase tracking-tighter leading-none mb-2">{s.displayName}</h4>
                         <p className="text-[10px] font-black text-accent uppercase tracking-widest italic opacity-60">{s.targetExam || 'YKS SÖZEL'} ADAYI</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 relative z-10">
                      <Button onClick={() => openStudentSimulation(s.uid)} className="h-14 rounded-2xl bg-[#0F172A] hover:bg-accent text-white font-black text-[9px] uppercase tracking-widest gap-3 shadow-2xl group/btn">
                         <Eye className="h-4 w-4 text-accent group-hover/btn:text-white" /> SİMÜLE ET
                      </Button>
                      <Button onClick={() => openChat(s.uid)} variant="outline" className="h-14 rounded-2xl border-2 border-slate-100 font-black text-[9px] uppercase tracking-widest gap-3 hover:bg-slate-50">
                         <MessageSquare className="h-4 w-4" /> MESAJ
                      </Button>
                   </div>
                </Card>
              ))}
              
              {filteredStudents.length === 0 && (
                <div className="col-span-full py-40 text-center opacity-20 italic font-black uppercase tracking-[0.5em] text-xs">Bağlı öğrenci bulunamadı...</div>
              )}
           </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {requests.map((r: any) => (
                <Card key={r.id} className="p-10 rounded-[3.5rem] border-none shadow-xl bg-white flex items-center justify-between group">
                   <div className="flex items-center gap-8">
                      <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform">
                         <UserRound className="h-8 w-8" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 italic">YENİ BAĞLANTI TALEBİ</p>
                         <p className="text-xl font-black text-primary tracking-tight">{r.message}</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <Button onClick={() => handleAcceptRequest(r)} size="icon" className="h-14 w-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-lg text-white">
                         <CheckCircle2 className="h-6 w-6" />
                      </Button>
                      <Button onClick={async () => await deleteDoc(doc(db!, 'requests', r.id))} size="icon" variant="ghost" className="h-14 w-14 rounded-2xl bg-slate-50 text-destructive hover:bg-destructive hover:text-white transition-all shadow-md">
                         <XCircle className="h-6 w-6" />
                      </Button>
                   </div>
                </Card>
              ))}
              {requests.length === 0 && (
                <div className="col-span-full py-40 text-center opacity-20 italic font-black uppercase tracking-[0.5em] text-xs">Bekleyen talep bulunmuyor...</div>
              )}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
