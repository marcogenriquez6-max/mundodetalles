import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { authService } from './services/auth.service'
import Layout from './components/Layout'
import { puedeAcceder } from './navigation'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Categorias from './pages/Categorias'
import Clientes from './pages/Clientes'
import Ventas from './pages/Ventas'
import Autorizaciones from './pages/Autorizaciones'
import Fidelizacion from './pages/Fidelizacion'
import Premios from './pages/Premios'
import Usuarios from './pages/Usuarios'
import Roles from './pages/Roles'
import Permisos from './pages/Permisos'
import Reportes from './pages/Reportes'
import ReportesGuardados from './pages/ReportesGuardados'
import Proveedores from './pages/Proveedores'
import Kardex from './pages/Kardex'
import Devoluciones from './pages/Devoluciones'
import Caja from './pages/Caja'
import Cotizaciones from './pages/Cotizaciones'
import Configuracion from './pages/Configuracion'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return authService.isAuthenticated() ? <>{children}</> : <Navigate to="/login" />
}

/** Impide abrir por URL una pantalla que el rol del usuario no tiene habilitada. */
function RoleRoute({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const rol = authService.getUsuario()?.rol
  return puedeAcceder(pathname, rol) ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="productos" element={<RoleRoute><Productos /></RoleRoute>} />
        <Route path="categorias" element={<RoleRoute><Categorias /></RoleRoute>} />
        <Route path="clientes" element={<RoleRoute><Clientes /></RoleRoute>} />
        <Route path="ventas" element={<RoleRoute><Ventas /></RoleRoute>} />
        <Route path="autorizaciones" element={<RoleRoute><Autorizaciones /></RoleRoute>} />
        <Route path="fidelizacion" element={<RoleRoute><Fidelizacion /></RoleRoute>} />
        <Route path="premios" element={<RoleRoute><Premios /></RoleRoute>} />
        <Route path="usuarios" element={<RoleRoute><Usuarios /></RoleRoute>} />
        <Route path="roles" element={<RoleRoute><Roles /></RoleRoute>} />
        <Route path="permisos" element={<RoleRoute><Permisos /></RoleRoute>} />
        <Route path="reportes" element={<RoleRoute><Reportes /></RoleRoute>} />
        <Route path="reportes-guardados" element={<RoleRoute><ReportesGuardados /></RoleRoute>} />
        <Route path="proveedores" element={<RoleRoute><Proveedores /></RoleRoute>} />
        <Route path="kardex" element={<RoleRoute><Kardex /></RoleRoute>} />
        <Route path="devoluciones" element={<RoleRoute><Devoluciones /></RoleRoute>} />
        <Route path="caja" element={<RoleRoute><Caja /></RoleRoute>} />
        <Route path="cotizaciones" element={<RoleRoute><Cotizaciones /></RoleRoute>} />
        <Route path="configuracion" element={<RoleRoute><Configuracion /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
