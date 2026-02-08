import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Page Components - AdInsight
import AdInsightPage from './pages/AdInsight/AdInsightPage';

// Page Components - Camp Tracking
import CampOverview from './pages/CampTracking/CampOverview';
import PlatformCampaigns from './pages/CampTracking/PlatformCampaigns';
import CampaignDetail from './pages/CampTracking/CampaignDetail';
import AllReminders from './pages/CampTracking/AllReminders';
import AllChanges from './pages/CampTracking/AllChanges';
import CampaignFormPage from './pages/CampTracking/CampaignFormPage';
import PlatformManagement from './pages/CampTracking/PlatformManagement';

import './App.css';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // Default light mode

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="app-container">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <main className={`main-wrapper ${sidebarCollapsed ? 'full' : ''}`}>
        <Header
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        <Routes>
          {/* Default route */}
          <Route path="/" element={<Navigate to="/camp-tracking" replace />} />

          {/* AdInsight Routes */}
          <Route path="/adinsight" element={<AdInsightPage />} />
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

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
