/**
 * Cross-platform Haptic Feedback Engine for Web and Ionic Capacitor.
 * Seamlessly interfaces with Capacitor Haptics plugin when running natively on iOS/Android,
 * gracefully falls back to the Web Vibration API, and safely no-ops on desktop browsers.
 */

export type HapticType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined') return

  try {
    // 1. Ionic Capacitor Native Haptics plugin bridge
    const cap = (window as any).Capacitor
    if (cap && cap.Plugins && cap.Plugins.Haptics) {
      if (type === 'selection') {
        cap.Plugins.Haptics.selectionChanged()
        return
      }
      if (type === 'success' || type === 'warning' || type === 'error') {
        cap.Plugins.Haptics.notification({ type: type.toUpperCase() })
        return
      }
      cap.Plugins.Haptics.impact({ style: type.toUpperCase() })
      return
    }

    // 2. Standard Web Vibration API fallback for mobile browsers
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (type) {
        case 'selection':
          navigator.vibrate(6)
          break
        case 'light':
          navigator.vibrate(10)
          break
        case 'medium':
          navigator.vibrate(18)
          break
        case 'heavy':
          navigator.vibrate(28)
          break
        case 'success':
          navigator.vibrate([8, 35, 12])
          break
        case 'warning':
          navigator.vibrate([12, 45, 15])
          break
        case 'error':
          navigator.vibrate([20, 35, 20, 35, 25])
          break
      }
    }
  } catch {
    // Graceful no-op if vibration permissions are restricted
  }
}
