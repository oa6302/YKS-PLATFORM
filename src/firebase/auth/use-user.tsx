
'use client';

import { useMemo } from 'react';

/**
 * @fileOverview Auth Bypass: Üyelik sistemi kaldırıldı, sistem herkese açık "Misafir" moduna alındı.
 * Nesne referansı sabitlenerek sonsuz döngü hataları engellendi.
 */
const GUEST_USER = { 
  uid: 'guest_yks_tm_user', 
  displayName: 'Misafir Öğrenci', 
  email: 'misafir@dek.com' 
};

export function useUser() {
  return useMemo(() => ({ 
    user: GUEST_USER, 
    loading: false 
  }), []);
}
