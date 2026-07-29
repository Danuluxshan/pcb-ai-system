import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard   from './pages/Dashboard';
import NewInspect  from './pages/NewInspection';
import Results     from './pages/Results';
import Diagnosis   from './pages/Diagnosis';
import History     from './pages/History';
import './index.css';

// Admin pages
import AdminLogin     from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDataset   from './pages/admin/AdminDataset';
import AdminTraining  from './pages/admin/AdminTraining';
import AdminModels    from './pages/admin/AdminModels';

// export default function App() {
//   return (
//     <BrowserRouter>
//       <Layout>
//         <Routes>
//           <Route path="/"          element={<Dashboard />} />
//           <Route path="/inspect"   element={<NewInspect />} />
//           <Route path="/results"   element={<Results />} />
//           <Route path="/results/:id" element={<Results />} />
//           <Route path="/diagnosis" element={<Diagnosis />} />
//           <Route path="/history"   element={<History />} />
//         </Routes>
//       </Layout>
//     </BrowserRouter>
//   );
// }

// Admin route guard
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    window.location.href = '/admin/login';
    return null;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main app */}
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/inspect" element={<Layout><NewInspect /></Layout>} />
        <Route path="/results" element={<Layout><Results /></Layout>} />
        <Route path="/results/:id" element={<Layout><Results /></Layout>} />
        <Route path="/diagnosis" element={<Layout><Diagnosis /></Layout>} />
        <Route path="/history" element={<Layout><History /></Layout>} />

        {/* Admin — no main Layout */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        }/>
        <Route path="/admin/dataset" element={
          <AdminRoute><AdminDataset /></AdminRoute>
        }/>
        <Route path="/admin/train" element={
          <AdminRoute><AdminTraining /></AdminRoute>
        }/>
        <Route path="/admin/models" element={
          <AdminRoute><AdminModels /></AdminRoute>
        }/>
      </Routes>
    </BrowserRouter>
  );
}