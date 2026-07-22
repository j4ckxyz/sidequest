import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { BrowseJobs } from './pages/BrowseJobs';
import { JobDetail } from './pages/JobDetail';
import { PostJob } from './pages/PostJob';
import { EditJob } from './pages/EditJob';
import { Dashboard } from './pages/Dashboard';
import { DashboardOverview } from './pages/DashboardOverview';
import { DashboardPosted } from './pages/DashboardPosted';
import { DashboardApplications } from './pages/DashboardApplications';
import { Messages } from './pages/Messages';
import { MessagesEmpty } from './pages/MessagesEmpty';
import { MessagesThreadPage } from './pages/MessagesThreadPage';
import { ProfileView } from './pages/ProfileView';
import { ProfileEdit } from './pages/ProfileEdit';
import { Admin } from './pages/Admin';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route path="/jobs" element={<BrowseJobs />} />
                <Route
                  path="/jobs/new"
                  element={
                    <ProtectedRoute>
                      <PostJob />
                    </ProtectedRoute>
                  }
                />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route
                  path="/jobs/:id/edit"
                  element={
                    <ProtectedRoute>
                      <EditJob />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardOverview />} />
                  <Route path="posted" element={<DashboardPosted />} />
                  <Route path="applications" element={<DashboardApplications />} />
                </Route>
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<MessagesEmpty />} />
                  <Route path=":conversationId" element={<MessagesThreadPage />} />
                </Route>
                <Route path="/profile/:id" element={<ProfileView />} />
                <Route path="/u/:username" element={<ProfileView />} />
                <Route
                  path="/profile/edit"
                  element={
                    <ProtectedRoute>
                      <ProfileEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
