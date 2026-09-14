/**
 * @fileOverview YKS TM (Eşit Ağırlık) - Sözel Odaklı Müfredat Verisi
 * Dil Bilgisi ve Geometri tamamen çıkarılmıştır.
 * TYT Matematik (Cebir & Problemler) dahil edildi.
 */

export const TYT_MATEMATIK = [
  'Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB-EKOK', 
  'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar', 
  'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran-Orantı', 'Denklem Çözme', 
  'Sayı Problemleri', 'Kesir Problemleri', 'Yaş Problemleri', 'İşçi Problemleri', 
  'Hız ve Hareket Problemleri', 'Yüzde, Kar ve Zarar Problemleri', 'Karışım Problemleri', 
  'Grafik Problemleri', 'Kümeler', 'Fonksiyonlar', 'Permütasyon - Kombinasyon', 
  'Olasılık', 'Veri ve İstatistik'
];

export const TYT_SOZEL_TOPICS: Record<string, string[]> = {
  'TYT Matematik': TYT_MATEMATIK,
  'TYT Türkçe': [
    'Sözcükte Anlam', 'Söz Öbeklerinde Anlam', 'Cümlede Anlam', 'Cümlede Kavramlar',
    'Paragrafta Ana Düşünce', 'Paragrafta Yardımcı Düşünceler', 'Paragrafta Yapı', 
    'Paragraf Bölme', 'Paragraf Tamamlama', 'Düşünceyi Geliştirme Yolları', 'Anlatım Biçimleri', 'Sözel Mantık'
  ],
  'TYT Tarih': [
    'Tarih ve Zaman', 'İlk Çağ Uygarlıkları', 'İslam Tarihi', 'Türk-İslam Devletleri', 
    'Osmanlı Kuruluş ve Yükselme', 'Osmanlı Duraklama ve Gerileme', 'Osmanlı Dağılma',
    'Milli Mücadele Hazırlık', 'Kurtuluş Savaşı', 'Atatürk İlkeleri ve İnkılapları'
  ],
  'TYT Coğrafya': [
    'Doğa ve İnsan', 'Dünya\'nın Şekli ve Hareketleri', 'Harita Bilgisi', 'Atmosfer ve İklim', 
    'İç ve Dış Kuvvetler', 'Nüfus ve Yerleşme', 'Ekonomik Faaliyetler', 'Bölgeler',
    'Türkiye\'nin Yer Şekilleri', 'Doğal Afetler'
  ],
  'TYT Felsefe': [
    'Felsefe ile Tanışma', 'Bilgi Felsefesi', 'Varlık Felsefesi', 'Ahlak Felsefesi', 
    'Din Felsefesi', 'Siyaset Felsefesi', 'Bilim Felsefesi'
  ],
  'TYT Din': [
    'Bilgi ve İnanç', 'İbadet ve Ahlak', 'Hz. Muhammed (S.A.V)', 'Vahiy ve Akıl', 
    'İslam ve Barış', 'Türklerin Müslüman Olma Süreci', 'İslam Medeniyetinde Bilim'
  ]
};

export const AYT_SOZEL_TOPICS: Record<string, string[]> = {
  'Edebiyat': [
    'Söz Sanatları', 'Şiir Bilgisi', 'İslamiyet Öncesi Türk Edebiyatı', 'Halk Edebiyatı', 
    'Divan Edebiyatı', 'Tanzimat Edebiyatı', 'Servet-i Fünun', 'Milli Edebiyat', 
    'Cumhuriyet Dönemi Şiir', 'Cumhuriyet Dönemi Roman', 'Cumhuriyet Dönemi Tiyatro'
  ],
  'AYT Tarih': [
    'Tarih Bilimi', 'Uygarlığın Doğuşu', 'Orta Çağda Dünya', 'Türklerin İslamiyeti Kabulü',
    'Beylikten Devlete Osmanlı', 'Dünya Gücü Osmanlı', 'Modernleşen Türkiye', '21. Yüzyıl Dünyası'
  ],
  'AYT Coğrafya': [
    'Ekosistemlerin İşleyişi', 'Biyoçeşitlilik', 'Nüfus Politikaları', 'Türkiye Ekonomisi',
    'Küresel Ticaret', 'Sıcak Bölgeler', 'Çevre ve Toplum'
  ],
  'Felsefe Grubu': [
    'Psikolojiye Giriş', 'Sosyolojinin Alanı', 'Mantığa Giriş', 'Klasik Mantık'
  ],
  'AYT Din': [
    'Kur\'an\'da Bazı Kavramlar', 'İnançla İlgili Meseleler', 'İslam ve Estetik'
  ]
};

export const YKS_TM_TOPICS: Record<string, string[]> = {
  ...TYT_SOZEL_TOPICS,
  ...AYT_SOZEL_TOPICS
};