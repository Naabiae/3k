import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import PaymentDashboard from './pages/PaymentDashboard'
import PaymentFlow from './pages/PaymentFlow'

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PaymentDashboard />} />
          <Route path="/dashboard" element={<PaymentDashboard />} />
          <Route path="/receipts" element={<PaymentDashboard />} />
          <Route path="/settings" element={<PaymentDashboard />} />
          <Route path="/pay/:routerAddress" element={<PaymentFlow />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  )
}

export default App
