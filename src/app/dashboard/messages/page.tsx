
'use client';

import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, ShieldCheck, Brain, ArrowLeft, Home, 
  Search, UserRound, Loader2, Sparkles, Lock
} from 'lucide-react';
import { 
  collection, addDoc, query, where, orderBy, 
  serverTimestamp, onSnapshot, limit, doc 
} from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function MessagesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('with');
  
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mevcut kullanıcı verisi
  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  
  // Hedef kullanıcı (mesajlaşılan kişi) verisi
  const { data: targetUser } = useDoc<any>(targetId ? `users/${targetId}` : null);

  // Kontakt Listesi (Eşleşmiş Kişiler)
  const { data: contacts = [] } = useCollection<any>(
    'users',
    userData?.role === 'teacher' 
      ? where('teacherIds', 'array-contains', user?.uid || '')
      : where('uid', '==', userData?.teacherIds?.[0] || 'none') // Öğrenci için ilk öğretmeni
  );

  useEffect(() => {
    if (!db || !user?.uid || !targetId) return;

    const chatId = [user.uid, targetId].sort().join('_');
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [db, user?.uid, targetId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.uid || !targetId || !msgInput.trim()) return;

    const chatId = [user.uid, targetId].sort().join('_');
    const msg = msgInput;
    setMsgInput('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        receiverId: targetId,
        text: msg,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* Sol Panel: Kişiler */}
      <aside className="w-full md:w-[400px] border-r border-slate-100 bg-white flex flex-col h-screen sticky top-0 overflow-hidden">
         <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-12 w-12 rounded-xl bg-slate-50"><ArrowLeft className="h-6 w-6" /></Button>
               <h2 className="text-3xl font-black italic tracking-tighter text-primary uppercase leading-none">MESAJ<br /><span className="text-accent">MERKEZİ</span></h2>
            </div>
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20" />
               <Input placeholder="Kişilerde ara..." className="h-14 rounded-xl bg-slate-50 border-none pl-12 font-bold shadow-inner" />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-3 scrollbar-hide">
            {contacts.map((c: any) => (
              <button 
                key={c.uid} 
                onClick={() => router.push(`/dashboard/messages?with=${c.uid}`)}
                className={cn(
                  "w-full flex items-center gap-5 p-6 rounded-[2rem] border transition-all text-left group",
                  targetId === c.uid ? "bg-primary text-white border-primary shadow-2xl scale-[1.02]" : "bg-white border-slate-50 hover:bg-slate-50"
                )}
              >
                 <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-primary font-black text-xl italic group-hover:rotate-6 transition-all shrink-0 shadow-inner">
                    {c.displayName?.charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="font-black text-sm tracking-tight truncate uppercase">{c.displayName}</p>
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-40", targetId === c.uid ? "text-accent" : "text-primary")}>
                       {c.role === 'teacher' ? 'AKADEMİK KOÇ' : 'ADAY ÖĞRENCİ'}
                    </p>
                 </div>
              </button>
            ))}
         </div>
      </aside>

      {/* Sağ Panel: Chat Alanı */}
      <main className="flex-1 flex flex-col h-screen bg-[#F8FAFC] relative">
         {targetId && targetUser ? (
           <>
             <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-20">
                <div className="flex items-center gap-5">
                   <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-black italic shadow-lg">
                      {targetUser.displayName?.charAt(0)}
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-primary italic uppercase tracking-tighter">{targetUser.displayName}</h3>
                      <div className="flex items-center gap-2">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Çevrimiçi · KVKK Korumalı</span>
                      </div>
                   </div>
                </div>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-primary/40">
                   <Lock className="h-3.5 w-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Encryption</span>
                </div>
             </header>

             <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {messages.map((m: any, i: number) => {
                  const isMine = m.senderId === user?.uid;
                  return (
                    <div key={i} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMine ? "justify-end" : "justify-start")}>
                       <div className={cn(
                         "max-w-[70%] p-6 rounded-[2.25rem] shadow-xl relative",
                         isMine ? "bg-primary text-white rounded-br-none" : "bg-white text-primary rounded-bl-none border border-slate-50"
                       )}>
                          <p className="font-bold text-sm leading-relaxed">{m.text}</p>
                          <p className={cn("text-[8px] font-black uppercase tracking-widest mt-3 opacity-30 text-right")}>
                             {m.createdAt ? format(m.createdAt.toDate(), 'HH:mm') : 'Gönderiliyor...'}
                          </p>
                       </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
             </div>

             <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                <form onSubmit={handleSend} className="flex items-center gap-4 max-w-4xl mx-auto w-full relative">
                   <Input 
                     value={msgInput}
                     onChange={(e) => setMsgInput(e.target.value)}
                     placeholder="Akademik bir mesaj yazın..." 
                     className="flex-1 h-18 rounded-2xl bg-slate-50 border-none shadow-inner pl-8 font-bold text-sm focus-visible:ring-accent transition-all pr-24"
                   />
                   <Button type="submit" disabled={!msgInput.trim()} className="absolute right-2 h-14 w-14 rounded-xl bg-primary hover:bg-accent text-white shadow-2xl transition-all active:scale-95">
                      <Send className="h-6 w-6" />
                   </Button>
                </form>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center gap-8 opacity-20 grayscale">
              <Brain className="h-32 w-32 text-primary" />
              <div className="text-center space-y-2">
                 <p className="text-3xl font-black uppercase tracking-[0.5em] italic">TERMİNAL BEKLİYOR</p>
                 <p className="text-[10px] font-bold uppercase tracking-widest">MESAJLAŞMAK İÇİN BİR KİŞİ SEÇİN</p>
              </div>
           </div>
         )}
      </main>
    </div>
  );
}
