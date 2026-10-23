import { useCallback, useEffect, useState } from 'react'
import { getAdminPreferences, subscribeAdminPreferences } from '../services/adminPreferencesService'
import { translateAdminText } from '../services/adminTranslations'

// Menggunakan preferensi yang sama dengan navbar/settings yang sudah ada.
// Mengganti bahasa memicu rerender langsung tanpa refresh halaman.
export default function useAdminTranslation() {
  const [language, setLanguage] = useState(() => getAdminPreferences()?.language || 'id')

  useEffect(() => {
    setLanguage(getAdminPreferences()?.language || 'id')
    return subscribeAdminPreferences((preferences) => {
      setLanguage(preferences?.language || 'id')
    })
  }, [])

  const t = useCallback((key, params) => translateAdminText(language, key, params), [language])
  return { t, language, locale: String(language).startsWith('en') ? 'en-US' : 'id-ID' }
}
