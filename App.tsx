
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.tsx';
import Layout from './components/Layout.tsx';
import Home from './pages/Home.tsx';
import About from './components/About.tsx';
import Contact from './components/Contact.tsx';
import WorkshopDetail from './pages/WorkshopDetail.tsx';
import { Workshop } from './types.ts';
import { AdminProvider } from './contexts/AdminContext.tsx';
import AdminToolbar from './components/AdminToolbar.tsx';
import { FirestoreService } from './services/FirestoreService.ts';

const App: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const data = await FirestoreService.getAllWorkshops();
        
        if (data.length === 0) {
          // Fallback to local JSON if Firestore is empty
          const res = await fetch('./workshopsData.json');
          const localData = await res.json();
          setWorkshops(localData);
        } else {
          setWorkshops(data);
        }
      } catch (err) {
        console.error("Error loading workshops:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshops();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-blue-900 font-black font-creative text-3xl animate-bounce">בונים את החוויה היהודית...</p>
    </div>
  );

  return (
    <AdminProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home workshops={workshops} />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/workshop/:id" element={<WorkshopDetail workshops={workshops} />} />
          </Routes>
        </Layout>
        <AdminToolbar />
      </HashRouter>
    </AdminProvider>
  );
};

export default App;
