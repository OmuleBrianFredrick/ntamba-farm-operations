import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { lazy, Suspense } from 'react'
import { RequireRole } from './auth/RequireRole'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage').then((module) => ({ default: module.SetPasswordPage })))
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const DailyWorkPage = lazy(() => import('./pages/DailyWorkPage').then((module) => ({ default: module.DailyWorkPage })))
const CropsPage = lazy(() => import('./pages/CropsPage').then((module) => ({ default: module.CropsPage })))
const NewPlantingPage = lazy(() => import('./pages/NewPlantingPage').then((module) => ({ default: module.NewPlantingPage })))
const CropRecordPage = lazy(() => import('./pages/CropRecordPage').then((module) => ({ default: module.CropRecordPage })))
const AnimalOperationsPage = lazy(() => import('./pages/AnimalOperationsPage').then((module) => ({ default: module.AnimalOperationsPage })))
const StockPage = lazy(() => import('./pages/StockPage').then((module) => ({ default: module.StockPage })))
const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })))
const QhsePage = lazy(() => import('./pages/QhsePage').then((module) => ({ default: module.QhsePage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const AdministrationPage = lazy(() => import('./pages/AdministrationPage').then((module) => ({ default: module.AdministrationPage })))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="login" element={<Suspense fallback={<div className="route-loading">Loading sign in.</div>}><LoginPage /></Suspense>} />
          <Route path="set-password" element={<Suspense fallback={<div className="route-loading">Loading account setup.</div>}><SetPasswordPage /></Suspense>} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Suspense fallback={<div className="route-loading">Loading overview.</div>}><OverviewPage /></Suspense>} />
              <Route path="daily-work" element={<Suspense fallback={<div className="route-loading">Loading daily work.</div>}><DailyWorkPage /></Suspense>} />
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
              <Route element={<RequireRole allowed={['ceo', 'administrator', 'farm_manager']} />}>
                <Route path="administration" element={<Suspense fallback={<div className="route-loading">Loading administration…</div>}><AdministrationPage /></Suspense>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
      </Routes>
    </BrowserRouter>
  )
}
