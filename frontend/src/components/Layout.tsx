import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { navItems } from '../navigation'
import NotificacionesAutorizacion from './NotificacionesAutorizacion'


function NavIcon({ path }: { path: string }) {
  const item = navItems.find(i => i.path === path)
  if (!item) return null
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024)
  const [showUserMenu, setShowUserMenu] = useState(false)
  // En celular/tablet (< 1024 px) el menú es un panel deslizable que se abre con el botón ☰.
  const [menuMovil, setMenuMovil] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const usuario = authService.getUsuario()

  // Al cambiar de pantalla se cierran el panel móvil y el menú de usuario.
  useEffect(() => { setMenuMovil(false); setShowUserMenu(false) }, [location.pathname])

  // Clic fuera del menú de usuario lo cierra.
  useEffect(() => {
    if (!showUserMenu) return
    const fuera = (e: MouseEvent) => { if (!userMenuRef.current?.contains(e.target as Node)) setShowUserMenu(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [showUserMenu])

  // En el panel móvil siempre se muestran las etiquetas completas.
  const expandido = sidebarOpen || menuMovil

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {menuMovil && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[2px] lg:hidden animate-fade-in" onClick={() => setMenuMovil(false)} aria-hidden="true" />
      )}
      <aside className={`${expandido ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col z-40
        fixed inset-y-0 left-0 lg:static lg:translate-x-0 ${menuMovil ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between h-16">
          <Link to="/" className={`flex items-center gap-3 ${!expandido ? 'hidden' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm tracking-wide">Mundo Detalles</p>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase">Sistema de Gestión</p>
            </div>
          </Link>
          <button onClick={() => setMenuMovil(false)} aria-label="Cerrar menú" className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'} className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-white">
            <svg className={`w-5 h-5 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(usuario?.rol as string))
            .map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!expandido ? item.label : undefined}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
                }`}
              >
                <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-blue-300' : 'text-slate-500 group-hover:text-white transition-colors'}`}>
                  <NavIcon path={item.path} />
                </div>
                {expandido && <span className="text-sm font-medium">{item.label}</span>}
                {isActive && expandido && (
                  <div className="ml-auto w-1.5 h-5 rounded-full bg-blue-400" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className={`p-4 border-t border-slate-800 ${!expandido ? 'text-center' : ''}`}>
          <div className={`flex items-center gap-3 ${!expandido ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-inner">
              {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
            </div>
            {expandido && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{usuario?.nombre} {usuario?.apellido}</p>
                <p className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{usuario?.rol}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between gap-2 px-3 sm:px-6 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setMenuMovil(true)} aria-label="Abrir menú" className="lg:hidden shrink-0 p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {location.pathname === '/' ? 'Resumen del sistema' : `Gestión de ${navItems.find(i => i.path === location.pathname)?.label?.toLowerCase() || ''}`}
            </p>
          </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {usuario?.rol === 'Administrador' && <NotificacionesAutorizacion />}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Menú de usuario"
                className="flex items-center gap-2.5 px-2 sm:px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                  {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-700 leading-tight">{usuario?.nombre} {usuario?.apellido}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{usuario?.rol}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-scale-in">
                  {usuario?.rol === 'Administrador' && (<>
                  <button onClick={() => { setShowUserMenu(false); navigate('/configuracion') }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuración
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  </>)}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
