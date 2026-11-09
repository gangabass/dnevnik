
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidHeader } from './components/AndroidHeader';
import { AndroidBottomNav, TabType } from './components/AndroidBottomNav';
import { UserFeedView } from './components/UserFeedView';
import { GradesView } from './components/GradesView';
import { HomeworkView } from './components/HomeworkView';
import { ScheduleView } from './components/ScheduleView';
import { PushNotificationSettings } from './components/PushNotificationSettings';
import { GosuslugiAuthModal } from './components/GosuslugiAuthModal';
import { GradeDetailModal } from './components/GradeDetailModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';

import {
  checkApiHealth,
  getProfile,
  type ProfileResponse
} from './services/apiService';

import {
  StudentProfile,
  GradeItem,
  HomeworkItem,
  FeedItem,
  PushNotificationConfig
} from './types';

import { storageService, PushLogItem } from './services/storageService';
import { notificationService } from './services/notificationService';
import { SIMULATED_NEW_GRADES } from './data/mockData';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  const [student, setStudent] = useState<StudentProfile>(
    () => storageService.getStudent()
  );

  const [grades, setGrades] = useState<GradeItem[]>(
    () => storageService.getGrades()
  );

  const [homework, setHomework] = useState<HomeworkItem[]>(
    () => storageService.getHomework()
  );

  const [feed, setFeed] = useState<FeedItem[]>(
    () => storageService.getFeed()
  );

  const [pushConfig, setPushConfig] = useState<PushNotificationConfig>(
    () => storageService.getPushConfig()
  );

  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeItem | null>(null);

  const { isInstallable, install } = usePWAInstall();

  // API connection status
  const [apiStatus, setApiStatus] = useState<
    'checking' | 'online' | 'offline'
  >('checking');

  // Profile received from Cloudflare Worker
  const [apiProfile, setApiProfile] = useState<
    ProfileResponse['profile'] | null
  >(null);

  const [profileStatus, setProfileStatus] = useState<
    'loading' | 'loaded' | 'error'
  >('loading');

  // Keep state synced in localStorage
  useEffect(() => {
    storageService.saveStudent(student);
  }, [student]);

  useEffect(() => {
    storageService.saveGrades(grades);
  }, [grades]);

  useEffect(() => {
    storageService.saveHomework(homework);
  }, [homework]);

  useEffect(() => {
    storageService.saveFeed(feed);
  }, [feed]);

  useEffect(() => {
    storageService.savePushConfig(pushConfig);
  }, [pushConfig]);

  // Recalculate GPA whenever grades change
  useEffect(() => {
    const periodGrades = grades.filter(
      g => g.period === student.currentQuarter
    );

    const totalWeight = periodGrades.reduce(
      (acc, g) => acc + g.weight,
      0
    );

    const weightedSum = periodGrades.reduce(
      (acc, g) => acc + g.value * g.weight,
      0
    );

    const newGpa = totalWeight > 0
      ? parseFloat((weightedSum / totalWeight).toFixed(2))
      : 4.5;

    if (newGpa !== student.gpa) {
      setStudent(prev => ({ ...prev, gpa: newGpa }));
    }
  }, [grades, student.currentQuarter, student.gpa]);

  // Check Cloudflare Worker availability
  useEffect(() => {
    let active = true;

    checkApiHealth()
      .then((result) => {
        if (active) {
          setApiStatus(result.ok ? 'online' : 'offline');
        }
      })
      .catch((error) => {
        console.error('API connection error:', error);

        if (active) {
          setApiStatus('offline');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Load student profile from Cloudflare Worker
  useEffect(() => {
    let active = true;

    getProfile()
      .then((result) => {
        if (!active) return;

        if (result.ok && result.profile) {
          setApiProfile(result.profile);
          setProfileStatus('loaded');
        } else {
          setProfileStatus('error');
        }
      })
      .catch((error) => {
        console.error('Profile loading error:', error);

        if (active) {
          setProfileStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Function to process and deliver a new grade with push notification
  const handleAddNewGrade = useCallback(
    async (gradeInput: Omit<GradeItem, 'id' | 'date'>) => {
      const newGrade: GradeItem = {
        ...gradeInput,
        id: 'g-' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        isNew: true,
      };

      // 1. Add to grades list
      setGrades(prev => [newGrade, ...prev]);

      // 2. Add to Userfeed
      const newFeedItem: FeedItem = {
        id: 'feed-' + Date.now(),
        type: 'grade',
        title: `Новая оценка по предмету ${newGrade.subject}`,
        subtitle: `${student.schoolName} • ${student.className}`,
        text: `Выставлена отметка: «${newGrade.value}» (${newGrade.value === 5 ? 'отлично' : newGrade.value === 4 ? 'хорошо' : newGrade.value === 3 ? 'удовлетворительно' : 'неудовлетворительно'}, вес: ${newGrade.weight}). Вид: ${newGrade.workType}${newGrade.topic ? ` по теме «${newGrade.topic}»` : ''}.`,
        timestamp: 'Только что',
        subject: newGrade.subject,
        grade: newGrade.value,
        weight: newGrade.weight,
        author: newGrade.teacherName,
        authorRole: 'Учитель-предметник',
        isRead: false,
      };

      setFeed(prev => [newFeedItem, ...prev]);

      // 3. Dispatch native Android / Browser Push Notification
      await notificationService.sendGradeNotification(
        newGrade,
        pushConfig
      );

      // 4. Log to push history
      const pushLog: PushLogItem = {
        id: 'log-' + Date.now(),
        timestamp: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        title: `Новая отметка: ${newGrade.value} по ${newGrade.subject}`,
        body: `${newGrade.workType} (вес ${newGrade.weight}) • Учитель: ${newGrade.teacherName}`,
        gradeValue: newGrade.value,
        subject: newGrade.subject,
      };

      storageService.addPushLog(pushLog);
    },
    [student, pushConfig]
  );

  // Quick random teacher simulation
  const handleSimulateRandomGrade = useCallback(() => {
    const randomIndex = Math.floor(
      Math.random() * SIMULATED_NEW_GRADES.length
    );

    const template = SIMULATED_NEW_GRADES[randomIndex];
    handleAddNewGrade(template);
  }, [handleAddNewGrade]);

  const handleToggleHomework = (id: string) => {
    setHomework(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, isCompleted: !item.isCompleted }
          : item
      )
    );
  };

  const handleMarkFeedRead = (id: string) => {
    setFeed(prev =>
      prev.map(f =>
        f.id === id ? { ...f, isRead: true } : f
      )
    );
  };

  const handleMarkAllFeedRead = () => {
    setFeed(prev =>
      prev.map(f => ({ ...f, isRead: true }))
    );
  };

  const unreadFeedCount = feed.filter(f => !f.isRead).length;
  const pendingHwCount = homework.filter(h => !h.isCompleted).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md bg-slate-950 min-h-screen flex flex-col relative shadow-2xl border-x border-slate-800/80">

        {/* Android Status Bar */}
        <AndroidStatusBar unreadCount={unreadFeedCount} />

        {/* Dnevnik.ru Header */}
        <AndroidHeader
          student={student}
          unreadCount={unreadFeedCount}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenNotifications={() => setActiveTab('push')}
          isInstallable={isInstallable}
          onInstall={install}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 pt-3 overflow-y-auto no-scrollbar">

          {/* PWA Install Banner */}
          <PWAInstallBanner />

          {/* API Connection Status */}
          <div className="mb-2 flex items-center gap-2 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                apiStatus === 'online'
                  ? 'bg-green-500'
                  : apiStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500 animate-pulse'
              }`}
            />

            <span className="text-slate-400">
              API: {
                apiStatus === 'online'
                  ? 'Подключено'
                  : apiStatus === 'offline'
                    ? 'Нет соединения'
                    : 'Проверка соединения...'
              }
            </span>
          </div>

          {/* Profile received from Worker */}
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-3">

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-200">
                Профиль из Worker
              </span>

              {profileStatus === 'loaded' && (
                <span className="text-xs text-green-400">
                  Получен
                </span>
              )}

              {profileStatus === 'loading' && (
                <span className="text-xs text-yellow-400">
                  Загрузка...
                </span>
              )}

              {profileStatus === 'error' && (
                <span className="text-xs text-red-400">
                  Ошибка
                </span>
              )}
            </div>

            {profileStatus === 'loaded' && apiProfile && (
              <div className="space-y-1 text-sm">
                <div className="text-white font-medium">
                  {apiProfile.firstName} {apiProfile.lastName}
                </div>

                <div className="text-slate-400">
                  Класс: {apiProfile.className}
                </div>

                <div className="text-slate-400">
                  {apiProfile.schoolName}
                </div>

                {apiProfile.demo && (
                  <div className="pt-2 text-xs text-amber-400">
                    Демонстрационный профиль
                  </div>
                )}
              </div>
            )}

            {profileStatus === 'error' && (
              <div className="text-sm text-red-400">
                Не удалось загрузить профиль
              </div>
            )}

            {profileStatus === 'loading' && (
              <div className="text-sm text-slate-500">
                Получаем данные с сервера...
              </div>
            )}
          </div>

          {/* User Feed */}
          {activeTab === 'feed' && (
            <UserFeedView
              feed={feed}
              onMarkRead={handleMarkFeedRead}
              onMarkAllRead={handleMarkAllFeedRead}
              onSimulateNewGrade={handleSimulateRandomGrade}
              onOpenGradeDetail={(g) => setSelectedGrade(g)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              studentName={student.shortName}
            />
          )}

          {/* Grades */}
          {activeTab === 'grades' && (
            <GradesView
              grades={grades}
              onOpenGradeDetail={(g) => setSelectedGrade(g)}
              onSimulateNewGrade={handleSimulateRandomGrade}
              currentQuarter={student.currentQuarter}
            />
          )}

          {/* Homework */}
          {activeTab === 'homework' && (
            <HomeworkView
              homework={homework}
              onToggleHomework={handleToggleHomework}
            />
          )}

          {/* Schedule */}
          {activeTab === 'schedule' && (
            <ScheduleView />
          )}

          {/* Push Notification Settings */}
          {activeTab === 'push' && (
            <PushNotificationSettings
              config={pushConfig}
              onUpdateConfig={(c) => setPushConfig(c)}
              onSimulateCustomGrade={handleAddNewGrade}
            />
          )}

        </main>

        {/* Android Bottom Navigation */}
        <AndroidBottomNav
          currentTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          unreadFeedCount={unreadFeedCount}
          pendingHwCount={pendingHwCount}
          gpa={student.gpa}
        />

        {/* Offline Banner */}
        <OfflineIndicator />

        {/* Modals */}
        <GosuslugiAuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentStudent={student}
          onSelectStudent={(selected) => setStudent(selected)}
        />

        <GradeDetailModal
          grade={selectedGrade}
          onClose={() => setSelectedGrade(null)}
        />

      </div>
    </div>
  );
}
