'use client';

import { useUser, useDoc } from '@/firebase';
import { useState, useEffect } from 'react';
import { handleGetAiInsights } from '@/app/actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Sparkles, TrendingUp, Target, AlertTriangle, Lightbulb, Loader2, RefreshCcw, CheckCircle2, Home, ArrowLeft, Send, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GenerateAiInsightsOutput } from '@/ai/flows/generate-ai-insights';
import { useRouter } from 'next/navigation';

export default function AiAnalysisPage() {
  const { user } = useUser();
  const router = useRouter();
  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);
  const [insights, setInsights] = useState<GenerateAiInsightsOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const fetchInsights = async (customQuery?: string) => {
    if (!userData) return;
    setLoading(true);
    const result = await handleGetAiInsights({
      role: userData.role,
      userName: userData.displayName || 'Kullanıcı',
      targetExam: userData.targetExam,
      userQuery: customQuery,
      contextData: {
        school: userData.school,
        grade: userData.grade,
        branch: userData.branch,
        completedTopics: userData.completedTopics
      }
    });

    if (result.success && result.data) {
      setInsights(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userData && !insights) {
      fetchInsights();
    }
  }, [userData]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    fetchInsights(query);
    setQuery('');
  };

  if (loading && !insights) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-6 min-h-[60vh]">
        <div className="relative">
          <div className="h-24 w-24 animate-spin rounded-[2.5rem] border-[6px] border-accent border-t-transparent shadow-[0_0_50px_rgba(245,158,11,0.2)]" />
          <Brain className="absolute inset-0 m-auto h-10 w-10 text-accent animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-primary uppercase tracking-tighter italic">AI REHBER TERMİNALİ</p>
          <p className="text-sm text-muted-foreground font-medium italic animate-pulse">Nöronlar senkronize ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-14 space-y-12 max-w-7xl mx-auto w-full animate-in fade-in duration-1000 bg-[#F8FAFC]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()} 
              className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/dashboard')} 
              className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-primary hover:text-white transition-all"
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-accent/20 italic">
              <Sparkles className="h-3.5 w-3.5" /> SİNİRSEL ANALİZ MOTORU v66.0
            </div>
            <h2 className="text-6xl font-black tracking-tighter italic text-primary uppercase leading-none text-shadow-deep">
              AI Koç <br /><span className="text-accent text-shadow-accent">Terminali</span>
            </h2>
          </div>
        </div>
        <Button 
          onClick={() => fetchInsights()} 
          disabled={loading}
          className="h-16 px-10 rounded-[1.5rem] bg-primary hover:bg-accent transition-all font-black text-xs uppercase tracking-widest gap-4 shadow-2xl text-white"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCcw className="h-6 w-6 text-accent" />}
          GENEL ANALİZİ YENİLE
        </Button>
      </header>

      {/* İnteraktif Soru Alanı */}
      <Card className="p-4 rounded-[2.5rem] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] bg-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
         <form onSubmit={handleAsk} className="flex items-center gap-4 relative z-10">
            <div className="h-16 w-16 rounded-[1.25rem] bg-slate-50 flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-6 transition-all">
               <Brain className="h-8 w-8 text-primary" />
            </div>
            <Input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="AI Koçuna bir soru sor... (Örn: Matematik netlerimi nasıl artırırım?)"
              className="flex-1 h-16 border-none bg-transparent font-bold text-lg focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30"
            />
            <Button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="h-16 px-8 rounded-2xl bg-primary hover:bg-accent text-white font-black text-xs uppercase tracking-widest gap-3 shadow-2xl transition-all active:scale-95"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-accent" />}
              SORUYU GÖNDER
            </Button>
         </form>
      </Card>

      {insights && (
        <div className="space-y-12">
          <Card className="rounded-[4rem] border-none shadow-[0_60px_120px_-30px_rgba(15,23,42,0.2)] bg-[#0F172A] text-white p-16 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/20 transition-all duration-1000"></div>
            <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
              <div className="h-32 w-32 rounded-[2.5rem] bg-white/5 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-3xl shrink-0 group-hover:rotate-12 transition-transform duration-700">
                <Zap className="h-16 w-16 text-accent animate-pulse" />
              </div>
              <div className="space-y-6 text-center lg:text-left">
                <h3 className="text-2xl font-black italic tracking-[0.2em] text-accent/60 uppercase">KOÇUN CEVABI</h3>
                <p className="text-[2.2rem] leading-[1.1] font-black italic tracking-tight text-shadow-premium">
                  "{insights.summary}"
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {insights.insights.map((item, i) => {
              const Icon = {
                prediction: TrendingUp,
                suggestion: Lightbulb,
                analysis: Target,
                action_plan: Target,
                motivation: Sparkles,
                risk: AlertTriangle
              }[item.type] || Target;

              return (
                <Card key={i} className="group relative overflow-hidden rounded-[3.5rem] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] bg-white p-10 transition-all hover:-translate-y-4 hover:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.15)] border border-primary/5">
                  <div className={cn(
                    "absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2",
                    item.type === 'risk' ? 'bg-destructive' : 'bg-accent'
                  )}></div>
                  <div className="space-y-8">
                    <div className={cn(
                      "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all group-hover:rotate-6",
                      item.type === 'risk' ? 'bg-destructive text-white' : 'bg-primary text-white'
                    )}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border-primary/10">
                          {item.type.replace('_', ' ')}
                        </Badge>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          item.priority === 'high' ? 'text-destructive' : item.priority === 'medium' ? 'text-accent' : 'text-primary'
                        )}>
                          {item.priority === 'high' ? 'YÜKSEK' : item.priority === 'medium' ? 'ORTA' : 'DÜŞÜK'} Önem
                        </span>
                      </div>
                      <h4 className="font-black text-2xl italic tracking-tighter text-primary leading-none text-shadow-deep uppercase">{item.title}</h4>
                      <p className="text-[13px] text-muted-foreground font-medium leading-relaxed italic opacity-70">{item.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <Card className="rounded-[4.5rem] border-none shadow-[0_60px_120px_-30px_rgba(0,0,0,0.15)] bg-white p-16 space-y-12">
              <div className="flex items-center justify-between">
                <h4 className="text-4xl font-black italic tracking-tighter uppercase text-primary text-shadow-deep">AI AKSIYON PLANI</h4>
                <Target className="h-10 w-10 text-accent" />
              </div>
              <div className="space-y-6">
                {insights.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-accent/20 hover:bg-white hover:shadow-2xl transition-all group cursor-pointer">
                    <div className="h-14 w-14 rounded-2xl bg-white text-primary font-black flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-all text-xl italic shadow-inner">
                      {i + 1}
                    </div>
                    <p className="text-xl font-bold text-primary italic leading-tight flex-1">{step}</p>
                    <CheckCircle2 className="h-8 w-8 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-10">
              <Card className="rounded-[4.5rem] border-none shadow-[0_60px_120px_-30px_rgba(245,158,11,0.3)] bg-accent text-primary p-16 space-y-8 relative overflow-hidden group">
                <Lightbulb className="absolute top-10 right-10 h-20 w-20 opacity-20 group-hover:scale-125 transition-transform duration-700" />
                <h4 className="text-[10px] font-black italic tracking-[0.4em] uppercase opacity-40">AKADEMİK MOTİVASYON</h4>
                <p className="text-3xl font-black italic leading-[1.1] text-shadow-deep">
                  "Her saniye, saniyeler içinde hedefine bir adım daha yaklaştığın bir zaferdir. Bugünün emeği, yarının rütbesidir."
                </p>
                <div className="h-4 w-full bg-white/20 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary w-3/4 animate-pulse"></div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-12 rounded-[3.5rem] border border-primary/5 shadow-2xl space-y-3 group hover:bg-primary transition-all duration-500">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-white/40 italic">DOĞRULUK SKORU</p>
                   <p className="text-6xl font-black text-primary italic text-shadow-deep group-hover:text-accent tracking-tighter">%94</p>
                </div>
                <div className="bg-white p-12 rounded-[3.5rem] border border-primary/5 shadow-2xl space-y-3 group hover:bg-accent transition-all duration-500">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary/40 italic">VERİ KALİTESİ</p>
                   <p className="text-6xl font-black text-accent italic text-shadow-deep group-hover:text-primary tracking-tighter">A+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}