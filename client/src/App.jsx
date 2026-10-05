import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import ItemDetail from './pages/ItemDetail';
import ReportItem from './pages/ReportItem';
import Login from './pages/Login';
import Register from './pages/Register';
import MyPosts from './pages/MyPosts';
import Requests from './pages/Requests';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportItem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-posts"
            element={
              <ProtectedRoute>
                <MyPosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <Requests />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<p className="empty">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="footer">Campus Lost &amp; Found &middot; Software Engineering Project</footer>
    </>
  );
}
