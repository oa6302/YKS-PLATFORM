
import { 
  GraduationCap
} from 'lucide-react';

/**
 * @fileOverview Sadece YKS Sözel Konfigürasyonu.
 * Matematik ve Sayısal dersler plana dahil edilemez.
 */
export const EXAM_CONFIGS: Record<string, any> = {
  'YKS_SOZEL': {
    id: 'YKS_SOZEL',
    title: 'YKS SÖZEL (AKADEMİK)',
    category: 'ÜNİVERSİTE',
    description: 'Edebiyat, Tarih ve Coğrafya hedefleri için 15 Haziran 2027 odaklı otonom terminal.',
    targetGroup: '12. Sınıf & Mezun',
    icon: GraduationCap,
    academicYearStart: '2026-09-01',
    aytStartDate: '2026-12-01',
    examDate: '2027-06-15',
    tytLessons: ['TYT Türkçe', 'TYT Tarih', 'TYT Coğrafya', 'TYT Felsefe', 'TYT Din'],
    aytLessons: ['Edebiyat', 'AYT Tarih', 'AYT Coğrafya', 'Felsefe Grubu', 'AYT Din'],
    lessons: ['TYT Türkçe', 'TYT Tarih', 'TYT Coğrafya', 'TYT Felsefe', 'Edebiyat', 'Felsefe Grubu']
  }
};
