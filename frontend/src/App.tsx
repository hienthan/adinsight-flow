import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import StickyNotesSidebar from './components/layout/StickyNotesSidebar';

import { SAFE_PANEL_TRANSITION } from './lib/uiMotion';

import './App.css';

const AdInsightPage = lazy(() => import('./pages/AdInsight/AdInsightPage'));
const TrendSignalsPage = lazy(() => import('./pages/AdInsight/TrendSignalsPage'));
const CampOverview = lazy(() => import('./pages/CampTracking/CampOverview'));
const PlatformCampaigns = lazy(() => import('./pages/CampTracking/PlatformCampaigns'));
const CampaignDetail = lazy(() => import('./pages/CampTracking/CampaignDetail'));
const AllReminders = lazy(() => import('./pages/CampTracking/AllReminders'));
const AllChanges = lazy(() => import('./pages/CampTracking/AllChanges'));
const CampaignFormPage = lazy(() => import('./pages/CampTracking/CampaignFormPage'));
const PlatformManagement = lazy(() => import('./pages/CampTracking/PlatformManagement'));
const OutboundMapPage = lazy(() => import('./pages/OutboundMap/OutboundMapPage'));
const GlobalNotesPage = lazy(() => import('./pages/GlobalNotes/GlobalNotesPage'));

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stickySidebarPinned, setStickySidebarPinned] = useState(() => {
    return localStorage.getItem('stickySidebarPinned') === 'true';
  });
  const [stickySidebarOpen, setStickySidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Default light mode

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  React.useEffect(() => {
    localStorage.setItem('stickySidebarPinned', stickySidebarPinned.toString());
    if (stickySidebarPinned) {
      setStickySidebarOpen(true);
    }
  }, [stickySidebarPinned]);

  return (
    <div className="app-container">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <main
        className={`main-wrapper ${sidebarCollapsed ? 'full' : ''}`}
        style={{
          marginRight: stickySidebarOpen ? '420px' : '48px',
          transition: SAFE_PANEL_TRANSITION
        }}
      >
        <Header
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          stickySidebarOpen={stickySidebarOpen}
          onToggleStickySidebar={() => {
            if (!stickySidebarPinned) {
              setStickySidebarOpen(!stickySidebarOpen);
            }
          }}
        />

        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/camp-tracking" replace />} />
            <Route path="/adinsight" element={<Navigate to="/adinsight/klook" replace />} />
            <Route path="/adinsight/trends" element={<TrendSignalsPage />} />
            <Route path="/adinsight/:platform" element={<AdInsightPage />} />
            <Route path="/adinsight/:platform/:content" element={<AdInsightPage />} />
            <Route path="/camp-tracking" element={<CampOverview />} />
            <Route path="/camp-tracking/new" element={<CampaignFormPage />} />
            <Route path="/camp-tracking/edit/:campaignId" element={<CampaignFormPage />} />
            <Route path="/camp-tracking/platforms" element={<PlatformManagement />} />
            <Route path="/camp-tracking/outbound-map" element={<OutboundMapPage />} />
            <Route path="/camp-tracking/platform/:platformId" element={<PlatformCampaigns />} />
            <Route path="/camp-tracking/campaign/:campaignId" element={<CampaignDetail />} />
            <Route path="/camp-tracking/reminders" element={<AllReminders />} />
            <Route path="/camp-tracking/changes" element={<AllChanges />} />
            <Route path="/global-notes" element={<GlobalNotesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <StickyNotesSidebar
        open={stickySidebarOpen}
        pinned={stickySidebarPinned}
        onToggle={() => {
          if (!stickySidebarPinned) {
            setStickySidebarOpen(!stickySidebarOpen);
          }
        }}
        onPinToggle={() => setStickySidebarPinned(!stickySidebarPinned)}
      />
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="page-container" style={{ paddingTop: '4rem', color: 'var(--text-dim)', fontWeight: 700 }}>
      Loading...
    </div>
  );
}

export default App;
