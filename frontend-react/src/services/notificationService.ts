// src/services/notificationService.ts — Mobile Alert Notifications, Vibration & Audio Feedback
// Integrates Native Android Local Notifications (Capacitor) with Web/PWA fallback.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type NotificationSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

interface AlertNotificationOptions {
  id?: string | number;
  title: string;
  message: string;
  severity: NotificationSeverity;
  vibrate?: boolean;
  sound?: boolean;
}

// Track recently alerted IDs to prevent notification spam (within 30 seconds)
const recentAlerts = new Map<string, number>();
const DEDUP_WINDOW_MS = 30_000;

// Notification Channels on Android
const HIGH_RISK_CHANNEL_ID = 'malai_high_risk_channel';
const ADVISORY_CHANNEL_ID = 'malai_advisory_channel';
let channelsCreated = false;

/**
 * Initialize Android notification channels
 */
async function initAndroidChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform() || channelsCreated) return;

  try {
    // 1. High-priority channel for urgent high-risk alerts
    await LocalNotifications.createChannel({
      id: HIGH_RISK_CHANNEL_ID,
      name: 'High Risk Landslide Alerts',
      description: 'Critical early warnings for severe landslide hazards',
      importance: 5, // High priority (heads-up banner, sound, vibration)
      visibility: 1, // Public on lock screen
      vibration: true,
    });

    // 2. Default channel for moderate/low advisories
    await LocalNotifications.createChannel({
      id: ADVISORY_CHANNEL_ID,
      name: 'Landslide Advisories',
      description: 'Advisories and moderate hazard updates',
      importance: 4, // Default priority
      visibility: 1,
      vibration: true,
    });

    channelsCreated = true;
  } catch (err) {
    console.warn('[NotificationService] Failed to create notification channels:', err);
  }
}

// Initialize channels on startup if native
if (Capacitor.isNativePlatform()) {
  initAndroidChannels();
}

// Safe Web Audio Context singleton for synthesized alert chimes
let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Unlock Web Audio on first user interaction (touch/click) to bypass mobile autoplay policies.
 */
export function unlockAudioOnUserGesture(): void {
  if (audioUnlocked || typeof window === 'undefined') return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else if (ctx) {
      audioUnlocked = true;
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('pointerdown', unlock);
  };

  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('pointerdown', unlock, { once: true });
}

// Setup audio unlock listener
if (typeof window !== 'undefined') {
  unlockAudioOnUserGesture();
}

/**
 * Play a synthesized sound tone appropriate for the alert severity.
 * - HIGH: Urgent multi-tone warning burst (880Hz -> 1100Hz -> 880Hz)
 * - MODERATE / LOW: Gentle two-tone chime (523Hz -> 659Hz)
 */
export function playAlertSound(severity: NotificationSeverity = 'MODERATE'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'HIGH') {
      // Urgent, clear audible warning
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.46);
    } else {
      // Gentle advisory chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.31);
    }
  } catch {
    // Audio synthesis failure should never crash the application
  }
}

/**
 * Trigger controlled vibration on Android / supported devices.
 * - HIGH: 200ms -> 100ms pause -> 200ms
 * - MODERATE: short vibration (120ms)
 * - LOW: very short vibration (40ms)
 */
export async function triggerAlertVibration(severity: NotificationSeverity = 'MODERATE'): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (severity === 'HIGH') {
        await Haptics.vibrate({ duration: 200 });
        setTimeout(async () => {
          try {
            await Haptics.vibrate({ duration: 200 });
          } catch {}
        }, 300);
      } else if (severity === 'MODERATE') {
        await Haptics.vibrate({ duration: 120 });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (severity === 'HIGH') {
        navigator.vibrate([200, 100, 200]);
      } else if (severity === 'MODERATE') {
        navigator.vibrate([120]);
      } else {
        navigator.vibrate([40]);
      }
    }
  } catch {
    // Vibration failure safely handled
  }
}

/**
 * Request notification permission safely from the user / Android system (including Android 13+ POST_NOTIFICATIONS).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (Capacitor.isNativePlatform()) {
      await initAndroidChannels();
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      const result: NotificationPermission = granted ? 'granted' : 'denied';
      if (typeof window !== 'undefined') {
        localStorage.setItem('mv_notifications_permission', result);
      }
      return result;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      localStorage.setItem('mv_notifications_permission', permission);
      return permission;
    }
  } catch (err) {
    console.warn('[NotificationService] Permission request failed:', err);
  }
  return 'denied';
}

/**
 * Check current notification permission state.
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted' ? 'granted' : status.display === 'denied' ? 'denied' : 'default';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
  } catch {
    // Fallback
  }
  return 'denied';
}

/**
 * Synchronous getter for current permission state (reads cached state or window.Notification)
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('mv_notifications_permission');
    if (cached === 'granted' || cached === 'denied') {
      return cached as NotificationPermission;
    }
    if ('Notification' in window) {
      return Notification.permission;
    }
  }
  return 'default';
}

// Convert arbitrary ID string/number into a valid positive 32-bit integer for Android LocalNotifications
function hashToNotificationId(key: string | number): number {
  if (typeof key === 'number' && key > 0 && key <= 2147483647) {
    return Math.floor(key);
  }
  const str = String(key);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || Math.floor(Math.random() * 1000000) + 1;
}

/**
 * Dispatch an alert notification across visual, native notification, vibration, and sound channels.
 * Uses native Android local notifications on mobile and Web Notification API on desktop/PWA.
 */
export async function notifyAlert({
  id,
  title,
  message,
  severity,
  vibrate = true,
  sound = true,
}: AlertNotificationOptions): Promise<void> {
  const alertKey = id !== undefined ? String(id) : `${title}:${message}`;
  const now = Date.now();

  // Spam prevention: ignore if already notified recently
  const lastFired = recentAlerts.get(alertKey);
  if (lastFired && now - lastFired < DEDUP_WINDOW_MS) {
    return;
  }
  recentAlerts.set(alertKey, now);

  // Clean old entries
  recentAlerts.forEach((timestamp, key) => {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentAlerts.delete(key);
    }
  });

  // 1. Audio feedback (Web Audio chime)
  if (sound) {
    playAlertSound(severity);
  }

  // 2. Vibration feedback
  if (vibrate) {
    triggerAlertVibration(severity);
  }

  // 3. System / Native Notification
  try {
    if (Capacitor.isNativePlatform()) {
      await initAndroidChannels();
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') {
        const channelId = severity === 'HIGH' ? HIGH_RISK_CHANNEL_ID : ADVISORY_CHANNEL_ID;
        const notificationId = hashToNotificationId(alertKey);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title: `MALAI VIZHI: ${title}`,
              body: message,
              channelId,
              smallIcon: 'ic_launcher',
              schedule: { at: new Date(Date.now() + 100) },
              extra: { severity, alertKey },
            },
          ],
        });
      }
    } else if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const icon = '/favicon.svg';
      new Notification(`MALAI VIZHI: ${title}`, {
        body: message,
        icon,
        tag: `malai-alert-${alertKey}`,
      });
    }
  } catch (err) {
    console.warn('[NotificationService] Notification dispatch failed:', err);
  }
}
