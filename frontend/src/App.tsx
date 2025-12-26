import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AdminLayout } from './components/AdminLayout'
import { Home } from './pages/Home'
import { Lottery } from './pages/Lottery'
import { LotteryDetail } from './pages/LotteryDetail'
import { Scratch } from './pages/Scratch'
import { Wallet } from './pages/Wallet'
import { Recharge } from './pages/Recharge'
import { Exchange } from './pages/Exchange'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Verify } from './pages/Verify'
import {
  AdminDashboard,
  AdminLotteryTypes,
  AdminProducts,
  AdminUsers,
  AdminSettings,
  AdminLogs,
  AdminStatistics,
} from './pages/admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lottery" element={<Lottery />} />
          <Route path="lottery/:id" element={<LotteryDetail />} />
          <Route path="scratch/:id" element={<Scratch />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="recharge" element={<Recharge />} />
          <Route path="exchange" element={<Exchange />} />
          <Route path="profile" element={<Profile />} />
          <Route path="verify" element={<Verify />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="lottery" element={<AdminLotteryTypes />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="logs" element={<AdminLogs />} />
          <Route path="statistics" element={<AdminStatistics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
