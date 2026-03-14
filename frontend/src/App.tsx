import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import StickyNotesSidebar from './components/layout/StickyNotesSidebar';

// Page Components - AdInsight
import AdInsightPage from './pages/AdInsight/AdInsightPage';
import TrendSignalsPage from './pages/AdInsight/TrendSignalsPage';

// Page Components - Camp Tracking
import CampOverview from './pages/CampTracking/CampOverview';
import PlatformCampaigns from './pages/CampTracking/PlatformCampaigns';
import CampaignDetail from './pages/CampTracking/CampaignDetail';
import AllReminders from './pages/CampTracking/AllReminders';
import AllChanges from './pages/CampTracking/AllChanges';
import CampaignFormPage from './pages/CampTracking/CampaignFormPage';
import PlatformManagement from './pages/CampTracking/PlatformManagement';
import GlobalNotesPage from './pages/GlobalNotes/GlobalNotesPage';
import { SAFE_PANEL_TRANSITION } from './lib/uiMotion';

import './App.css';

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

        <Routes>
          {/* Default route */}
          <Route path="/" element={<Navigate to="/camp-tracking" replace />} />

          {/* AdInsight Routes */}
          <Route path="/adinsight" element={<Navigate to="/adinsight/klook" replace />} />
          <Route path="/adinsight/trends" element={<TrendSignalsPage />} />
          <Route path="/adinsight/:platform" element={<AdInsightPage />} />
          <Route path="/adinsight/:platform/:content" element={<AdInsightPage />} />

          {/* Camp Tracking Routes */}
          <Route path="/camp-tracking" element={<CampOverview />} />
          <Route path="/camp-tracking/new" element={<CampaignFormPage />} />
          <Route path="/camp-tracking/edit/:campaignId" element={<CampaignFormPage />} />
          <Route path="/camp-tracking/platforms" element={<PlatformManagement />} />
          <Route path="/camp-tracking/platform/:platformId" element={<PlatformCampaigns />} />
          <Route path="/camp-tracking/campaign/:campaignId" element={<CampaignDetail />} />
          <Route path="/camp-tracking/reminders" element={<AllReminders />} />
          <Route path="/camp-tracking/changes" element={<AllChanges />} />

          {/* Global Notes Route */}
          <Route path="/global-notes" element={<GlobalNotesPage />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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

export default App;
