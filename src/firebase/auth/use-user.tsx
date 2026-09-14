
'use client';

import { useMemo } from 'react';

/**
 * @fileOverview Auth Bypass: Üyelik sistemi kaldırıldı, sistem herkese açık "Misafir" moduna alındı.
 * Nesne referansı dışarıda tanımlanarak render döngüleri engellendi.
 */
const GUEST_USER = { 
  uid: 'guest_yks_tm_user', 
  displayName: 'Misafir Öğrenci', 
  email: 'misafir@dek.com' 
};

const STATIC_RESPONSE = { 
  user: GUEST_USER, 
  loading: false 
};

export function useUser() {
  // Her zaman aynı statik nesneyi döndürerek sonsuz döngüleri (Maximum update depth exceeded) engeller.
  return useMemo(() => STATIC_RESPONSE, []);
}
