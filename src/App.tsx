import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Apply from './pages/Apply';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import Saved from './pages/Saved';
import Employers from './pages/Employers';
import Placeholder from './pages/Placeholder';
import NotFound from './pages/NotFound';

// The onboarding quest is the largest page, so it ships as its own chunk (JS + CSS)
// and is prefetched once the browser is idle, so opening it still feels instant.
const loadSignIn = () => import('./pages/SignIn');
const SignIn = lazy(loadSignIn);

export default function App() {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => { void loadSignIn(); });
  }, []);
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="jobs/:id/apply" element={<Apply />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="saved" element={<Saved />} />
        <Route path="sign-in" element={<Suspense fallback={<div className="container" style={{ minHeight: '70vh' }} aria-busy="true" />}><SignIn /></Suspense>} />
        <Route path="employers" element={<Employers />} />
        <Route path="privacy" element={<Placeholder title="Privacy policy" />} />
        <Route path="terms" element={<Placeholder title="Terms of service" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
