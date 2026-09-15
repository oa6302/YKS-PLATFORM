
'use client';

import { useUser, useDoc } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { StudentView } from '@/components/dashboard/student-view';
import {
  format,
  addDays,
  differenceInDays,
  parseISO,
  isBefore,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { TYT_SOZEL_TOPICS, AYT_SOZEL_TOPICS } from '@/lib/curriculum-data';

const AYT_START_DATE = '2026-12-01';

/**
 * MASTER ADAPTIVE PLANNER v71.0 - Official Resource & Playlist Integration
 */
export const generateAdaptivePlan = (
  startDateStr: string,
  endDateStr: string,
  completedTopics: Record<string, string[]> = {},
  existingPlan: any[] = []
): any[] => {
  const startDate = parseISO(startDateStr);
  const aytDate = parseISO(AYT_START_DATE);
  const endDate = parseISO(endDateStr);
  const daysInterval = differenceInDays(endDate, startDate);

  if (daysInterval < 0) return [];

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
    return 'GENEL ANALİZ';
  };

  const getAutoLinks = (lesson: string, topic: string) => {
    const links: any[] = [
      { id: `mebi_${Date.now()}_1`, title: 'MEBİ İÇERİK PORTALI', url: `https://mebi.eba.gov.tr/student/home/content?q=${encodeURIComponent(topic)}`, type: 'mebi' },
      { id: `ogm_ozet_${Date.now()}_2`, title: 'MEBİ KONU ÖZETLERİ', url: 'https://ogmmateryal.eba.gov.tr/mebi-konu-ozeti-kitaplari', type: 'ogm' },
      { id: `ogm_deneme_${Date.now()}_3`, title: 'MEBİ YKS DENEMELERİ', url: 'https://ogmmateryal.eba.gov.tr/mebi-yks-denemeleri', type: 'ogm' }
    ];

    // Tarih Özel Playlist
    if (lesson.toLowerCase().includes('tarih')) {
      links.push({ id: `yt_tarih_${Date.now()}`, title: 'BENİM HOCAM TARİH (VİDEO)', url: 'https://www.youtube.com/playlist?list=PLnBnugScc-7Lnnh4bZMz8QVyIYSXtULr_', type: 'youtube' });
    }
    // Coğrafya Özel Playlist
    if (lesson.toLowerCase().includes('coğrafya')) {
      links.push({ id: `yt_cografya_${Date.now()}`, title: 'COĞRAFYANIN KODLARI (VİDEO)', url: 'https://www.youtube.com/playlist?list=PLCLfupK6Ie8Uow9njwNnXclaTqhLClYiA', type: 'youtube' });
    }

    return links;
  };

  for (let i = 0; i <= daysInterval; i++) {
    const currentDate = addDays(startDate, i);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayName = format(currentDate, 'EEEE', { locale: tr });
    const isAytStarted = !isBefore(currentDate, aytDate);
    
    const existingDay = existingPlan.find(d => d.date === dateStr);
    if (existingDay && existingDay.blocks?.some((b: any) => b.status === 'done' || b.isManuallyEdited || (b.links && b.links.length > 5))) {
      plan.push(existingDay);
      continue;
    }

    const dailyBlocks: any[] = [];
    const pool1 = isAytStarted ? AYT_SOZEL_TOPICS : TYT_SOZEL_TOPICS;
    const lessons1 = Object.keys(pool1);
    const lesson1 = lessons1[i % lessons1.length];
    const topic1 = getNextTopic(lesson1, pool1);

    dailyBlocks.push({
      id: `block_${dateStr}_1000`,
      time: '10:00',
      lesson: lesson1,
      topic: topic1,
      status: 'waiting',
      examType: isAytStarted ? 'AYT' : 'TYT',
      links: getAutoLinks(lesson1, topic1)
    });

    const tytLessons = Object.keys(TYT_SOZEL_TOPICS);
    const lesson2 = tytLessons[(i + 1) % tytLessons.length];
    const topic2 = getNextTopic(lesson2, TYT_SOZEL_TOPICS);
    dailyBlocks.push({
      id: `block_${dateStr}_1100`,
      time: '11:00',
      lesson: lesson2,
      topic: topic2,
      status: 'waiting',
      examType: 'TYT',
      links: getAutoLinks(lesson2, topic2)
    });

    dailyBlocks.push({
      id: `block_${dateStr}_1200`,
      time: '12:00',
      lesson: 'STRATEJİK TEKRAR',
      topic: 'DÜNÜN KRİTİK KAZANIMLARI',
      status: 'waiting',
      examType: 'GENEL'
    });

    dailyBlocks.push({
      id: `block_${dateStr}_1500`,
      time: '15:00',
      lesson: 'TYT TÜRKÇE',
      topic: '20 ADET PARAGRAF KONDİSYONU',
      status: 'waiting',
      examType: 'TYT'
    });

    plan.push({ date: dateStr, day: dayName, blocks: dailyBlocks });
  }

  return plan;
};

export default function DashboardPage() {
  const { user } = useUser();
  const { data: userData } = useDoc<any>(user?.uid ? `users/${user.uid}` : null);

  return (
    <div className="w-full">
      {userData ? (
        <StudentView user={user} userData={userData} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Veriler Yükleniyor</span>
        </div>
      )}
    </div>
  );
}
