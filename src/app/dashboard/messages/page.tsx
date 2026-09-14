'use client';

import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, Brain, ArrowLeft, Search, Loader2, Lock
} from 'lucide-react';
import { 
  collection, addDoc, query, orderBy, 
  serverTimestamp, onSnapshot, limit, where 
} from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

function MessagesContent() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('with');
  
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  const { data: targetUser } = useDoc<any>(targetId ? `users/${targetId}` : null);

  const { data: contacts = [] } = useCollection<any>(
    'users',
    userData?.role === 'teacher' 
      ? where('teacherIds', 'array-contains', user?.uid || '')
      : where('uid', '==', userData?.teacherIds?.[0] || 'none')
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
    <div className="flex flex-col md:flex-row h-full">
      {/* Sol Panel: Kişiler */}
      <aside className="w-full md:w-[350px] border-r border-slate-100 bg-white flex flex-col overflow-hidden shrink-0">
         <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-slate-50 md:hidden"><ArrowLeft className="h-5 w-5" /></Button>
               <h2 className="text-2xl font-black italic tracking-tighter text-primary uppercase leading-none">MESAJ<br /><span className="text-accent">MERKEZİ</span></h2>
            </div>
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/20" />
               <Input placeholder="Kişilerde ara..." className="h-12 rounded-xl bg-slate-50 border-none pl-12 font-bold shadow-inner text-xs" />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-2 scrollbar-hide">
            {contacts.map((c: any) => (
              <button 
                key={c.uid} 
                onClick={() => router.push(`/dashboard/messages?with=${c.uid}`)}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all text-left group",
                  targetId === c.uid ? "bg-primary text-white border-primary shadow-xl scale-[1.02]" : "bg-white border-slate-50 hover:bg-slate-50"
                )}
              >
                 <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-primary font-black text-lg italic group-hover:rotate-6 transition-all shrink-0 shadow-inner">
                    {c.displayName?.charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="font-black text-xs tracking-tight truncate uppercase">{c.displayName}</p>
                    <p className={cn("text-[8px] font-bold uppercase tracking-widest opacity-40", targetId === c.uid ? "text-accent" : "text-primary")}>
                       {c.role === 'teacher' ? 'AKADEMİK KOÇ' : 'ADAY ÖĞRENCİ'}
                    </p>
                 </div>
              </button>
            ))}
         </div>
      </aside>

      {/* Sağ Panel: Chat Alanı */}
      <main className="flex-1 flex flex-col bg-[#F8FAFC] relative overflow-hidden h-full">
         {targetId && targetUser ? (
           <>
             <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-black italic shadow-lg">
                      {targetUser.displayName?.charAt(0)}
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-primary italic uppercase tracking-tighter">{targetUser.displayName}</h3>
                      <div className="flex items-center gap-2">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">Çevrimiçi</span>
                      </div>
                   </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-primary/40">
                   <Lock className="h-3 w-3" />
                   <span className="text-[8px] font-black uppercase tracking-widest">KORUMALI</span>
                </div>
             </header>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {messages.map((m: any, i: number) => {
                  const isMine = m.senderId === user?.uid;
                  return (
                    <div key={i} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", isMine ? "justify-end" : "justify-start")}>
                       <div className={cn(
                         "max-w-[75%] p-5 rounded-[1.75rem] shadow-lg relative",
                         isMine ? "bg-primary text-white rounded-br-none" : "bg-white text-primary rounded-bl-none border border-slate-50"
                       )}>
                          <p className="font-bold text-xs leading-relaxed">{m.text}</p>
                          <p className={cn("text-[7px] font-black uppercase tracking-widest mt-2 opacity-30 text-right")}>
                             {m.createdAt ? format(m.createdAt.toDate(), 'HH:mm') : '...'}
                          </p>
                       </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
             </div>

             <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                <form onSubmit={handleSend} className="flex items-center gap-3 max-w-4xl mx-auto w-full relative">
                   <Input 
                     value={msgInput}
                     onChange={(e) => setMsgInput(e.target.value)}
                     placeholder="Mesaj yazın..." 
                     className="flex-1 h-14 rounded-2xl bg-slate-50 border-none shadow-inner pl-6 font-bold text-xs focus-visible:ring-accent transition-all pr-16"
                   />
                   <Button type="submit" disabled={!msgInput.trim()} className="absolute right-1.5 h-11 w-11 rounded-xl bg-primary hover:bg-accent text-white shadow-xl transition-all">
                      <Send className="h-5 w-5" />
                   </Button>
                </form>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center gap-6 opacity-10 grayscale">
              <Brain className="h-24 w-24 text-primary" />
              <div className="text-center space-y-1">
                 <p className="text-xl font-black uppercase tracking-[0.4em] italic">TERMİNAL BEKLİYOR</p>
                 <p className="text-[8px] font-bold uppercase tracking-widest">BİR SOHBET SEÇİN</p>
              </div>
           </div>
         )}
      </main>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-accent" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}
