import { GradeItem, PushNotificationConfig } from '../types';

class NotificationService {
  private audioCtx: AudioContext | null = null;

  // Initialize Web Audio chime sound
  private playGradeChime(isTopGrade: boolean) {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Polyphonic school chime / accomplishment tone
      const notes = isTopGrade ? [523.25, 659.25, 783.99, 1046.5] : [440.0, 554.37, 659.25]; // C5-E5-G5-C6 or A4-C#5-E5
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch {
      // Audio playback silently suppressed if blocked by user autoplay policy
    }
  }

  // Check if browser notifications are supported
  public isSupported(): boolean {
    return 'Notification' in window;
  }

  // Get current permission state
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Request browser permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const res = await Notification.requestPermission();
      return res;
    } catch {
      return 'denied';
    }
  }

  // Send a push notification for a new grade
  public async sendGradeNotification(
    grade: GradeItem,
    config: PushNotificationConfig
  ): Promise<boolean> {
    if (!config.enabled) return false;

    // Check quiet hours
    if (config.quietHoursEnabled) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = config.quietHoursStart.split(':').map(Number);
      const [endH, endM] = config.quietHoursEnd.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      const isQuiet = startMin > endMin
        ? (currentMinutes >= startMin || currentMinutes < endMin)
        : (currentMinutes >= startMin && currentMinutes < endMin);

      if (isQuiet) return false;
    }

    // Check minimum grade filter
    if (grade.value < config.minGradeAlert) {
      return false;
    }

    const isTop = grade.value >= 4;
    const gradeEmoji = grade.value === 5 ? '🌟 5' : grade.value === 4 ? '👍 4' : grade.value === 3 ? '⚠️ 3' : '❌ 2';
    const title = `Дневник.ру Иркутск: Новая отметка ${gradeEmoji}`;
    const weightText = grade.weight > 1 ? ` (вес: ${grade.weight})` : '';
    const body = `${grade.subject}: ${grade.workType}${weightText} — «${grade.value}»\nУчитель: ${grade.teacherName}${grade.topic ? `\nТема: ${grade.topic}` : ''}`;

    // Play vibration on Android
    if (config.vibrationEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // ignore
      }
    }

    // Play sound
    if (config.soundEnabled) {
      this.playGradeChime(isTop);
    }

    // Native Notification or Service Worker notification
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `grade-${grade.id}-${Date.now()}`,
              data: { url: '/?tab=grades&gradeId=' + grade.id },
            });
            return true;
          }
        }

        // Fallback to Window Notification
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `grade-${grade.id}`,
        });
        return true;
      } catch (err) {
        console.warn('Could not trigger native notification:', err);
      }
    }

    return false;
  }

  // Send a custom test push notification
  public async sendTestNotification(config: PushNotificationConfig): Promise<boolean> {
    const testGrade: GradeItem = {
      id: 'test-' + Date.now(),
      subject: 'Алгебра',
      value: 5,
      weight: 2,
      workType: 'Контрольная работа',
      date: new Date().toISOString().slice(0, 10),
      topic: 'Проверка тестового пуш-уведомления Дневник.ру',
      teacherName: 'Ковалёва Ирина Викторовна',
      comment: 'Уведомления на телефоне успешно настроены!',
      period: 3,
      isNew: true,
    };

    return this.sendGradeNotification(testGrade, config);
  }
}

export const notificationService = new NotificationService();
