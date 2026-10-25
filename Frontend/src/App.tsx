
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import Login from './components/Login/Login';
import Home from "./components/Home/Home";
import Register from "./components/Register/Register"; 
import {ProtectedRoute , PublicOnlyRoute} from "./components/ProtectedRoute/ProtectedRoute";
import Tables from './components/Tables/Tables'
import Stats from "./components/Stats/Stats";
import Manage from "./components/Manage/Manage";

function LoginPage() {
  const navigate = useNavigate();
  // Login saves the JWT to localStorage itself; <PublicOnlyRoute> redirects once it's saved
  return <Login onGoToRegister={() => navigate("/register")} />;
}

function RegisterPage() {
  const navigate = useNavigate();
  return <Register onGoToLogin={() => navigate("/login")} onRegistered={() => navigate("/login")} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Only for people who are signed out */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Any signed-in user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/manage" element={<Manage />} />
        </Route>

        {/* Admins only. Example for a future page:
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route> */}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}