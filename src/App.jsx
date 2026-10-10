import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Terms from './pages/Terms';
import Overview from './pages/Overview';
import Upload from './pages/Upload';
import Reconciliation from './pages/Reconciliation';
import Mismatch from './pages/Mismatch';
import Fraud from './pages/Fraud';
import NetworkGraph from './pages/NetworkGraph';
import FraudGraph from './pages/FraudGraph';
import Cases from './pages/Cases';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import BlockchainUserDashboard from './securechain/pages/BlockchainUserDashboard';
import CreateTransactionPage from './securechain/pages/CreateTransactionPage';
import VerifyTransactionPage from './securechain/pages/VerifyTransactionPage';
import BlockchainGraphPage from './securechain/pages/BlockchainGraphPage';
import BlockLedger from './securechain/pages/admin/BlockLedger';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/blockchain/dashboard" element={<BlockchainUserDashboard />} />
      <Route path="/blockchain/profile" element={<BlockchainUserDashboard initialNav="Profile" />} />
      <Route path="/blockchain/settings" element={<BlockchainUserDashboard initialNav="Settings" />} />
      <Route path="/blockchain/transactions/create" element={<CreateTransactionPage />} />
      <Route path="/blockchain/verify" element={<VerifyTransactionPage />} />
      <Route path="/blockchain/graph" element={<BlockchainGraphPage />} />
      <Route path="/blockchain/blocks" element={<BlockLedger />} />
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="upload" element={<Upload />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="mismatch" element={<Mismatch />} />
        <Route path="fraud" element={<Fraud />} />
        <Route path="network-graph" element={<NetworkGraph />} />
        <Route path="fraud-graph" element={<FraudGraph />} />
        <Route path="cases" element={<Cases />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
