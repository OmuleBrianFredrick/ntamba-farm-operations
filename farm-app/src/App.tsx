import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DailyWorkPage } from './pages/DailyWorkPage'
import { OverviewPage } from './pages/OverviewPage'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { lazy, Suspense } from 'react'

const CropsPage = lazy(() => import('./pages/CropsPage').then((module) => ({ default: module.CropsPage })))
const NewPlantingPage = lazy(() => import('./pages/NewPlantingPage').then((module) => ({ default: module.NewPlantingPage })))
const CropRecordPage = lazy(() => import('./pages/CropRecordPage').then((module) => ({ default: module.CropRecordPage })))
const AnimalOperationsPage = lazy(() => import('./pages/AnimalOperationsPage').then((module) => ({ default: module.AnimalOperationsPage })))
const StockPage = lazy(() => import('./pages/StockPage').then((module) => ({ default: module.StockPage })))
const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })))
const QhsePage = lazy(() => import('./pages/QhsePage').then((module) => ({ default: module.QhsePage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const AdministrationPage = lazy(() => import('./pages/AdministrationPage').then((module) => ({ default: module.AdministrationPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewPage />} />
              <Route path="daily-work" element={<DailyWorkPage />} />
              <Route path="livestock" element={<Suspense fallback={<div className="route-loading">Loading livestock operations…</div>}><AnimalOperationsPage key="livestock" enterprise="livestock" /></Suspense>} />
              <Route path="poultry" element={<Suspense fallback={<div className="route-loading">Loading poultry operations…</div>}><AnimalOperationsPage key="poultry" enterprise="poultry" /></Suspense>} />
              <Route path="fish-apiary" element={<Suspense fallback={<div className="route-loading">Loading fish and apiary operations…</div>}><AnimalOperationsPage key="fish-apiary" enterprise="fish-apiary" /></Suspense>} />
              <Route path="crops" element={<Suspense fallback={<div className="route-loading">Loading crops…</div>}><CropsPage /></Suspense>} />
              <Route path="crops/new-planting" element={<Suspense fallback={<div className="route-loading">Loading planting form…</div>}><NewPlantingPage /></Suspense>} />
              <Route path="crops/record" element={<Suspense fallback={<div className="route-loading">Loading crop record…</div>}><CropRecordPage /></Suspense>} />
              <Route path="stock" element={<Suspense fallback={<div className="route-loading">Loading stock and inputs…</div>}><StockPage /></Suspense>} />
              <Route path="finance" element={<Suspense fallback={<div className="route-loading">Loading sales and finance…</div>}><FinancePage /></Suspense>} />
              <Route path="qhse" element={<Suspense fallback={<div className="route-loading">Loading QHSE forms…</div>}><QhsePage /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<div className="route-loading">Loading cross-enterprise reports…</div>}><ReportsPage /></Suspense>} />
              <Route path="administration" element={<Suspense fallback={<div className="route-loading">Loading administration…</div>}><AdministrationPage /></Suspense>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
