
/**
 * @fileOverview Sadece Sözel Müfredat Verisi (TYT-AYT)
 * Matematik, Geometri, Fen Bilimleri ve Dil Bilgisi konuları tamamen çıkarılmıştır.
 */

export const TYT_SOZEL_TOPICS: Record<string, string[]> = {
  'TYT Türkçe': [
    'Sözcükte Anlam (Gerçek-Mecaz-Yan Anlam)', 
    'Söz Öbeklerinde Anlam (Deyimler-Atasözleri)',
    'Cümlede Anlam (Yorum, Öznel-Nesnel)', 
    'Cümlede Kavramlar (Tahmin, Varsayım, Eleştiri)',
    'Paragrafta Ana Düşünce', 
    'Paragrafta Yardımcı Düşünceler', 
    'Paragrafta Yapı (Giriş-Gelişme-Sonuç)', 
    'Paragraf Bölme ve Akışı Bozan Cümle', 
    'Paragraf Tamamlama (Boşluk Doldurma)', 
    'Düşünceyi Geliştirme Yolları (Tanımlama, Örneklendirme vb.)', 
    'Anlatım Biçimleri (Açıklama, Tartışma vb.)',
    'Yazım Kuralları',
    'Noktalama İşaretleri'
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
    'Felsefe ile Tanışma', 'Bilgi Felsefesi (Epistemoloji)', 'Varlık Felsefesi (Ontoloji)', 
    'Ahlak Felsefesi (Etik)', 'Din Felsefesi', 'Siyaset Felsefesi', 'Bilim Felsefesi'
  ],
  'TYT Din': [
    'Bilgi ve İnanç', 'İbadet ve Ahlak', 'Hz. Muhammed (S.A.V)', 'Vahiy ve Akıl', 'İslam ve Barış',
    'Türklerin Müslüman Olma Süreci', 'İslam Medeniyetinde Bilim'
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

// Geriye dönük uyumluluk için birleşik havuz
export const YKS_TM_TOPICS: Record<string, string[]> = {
  ...TYT_SOZEL_TOPICS,
  ...AYT_SOZEL_TOPICS
};
