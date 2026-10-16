import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import { autorizacionesService } from '../services/autorizaciones.service'
import { getSocket, AutorizacionPendienteEvt } from '../services/realtime'
import { esc } from '../utils/html'

/**
 * Campana del administrador: muestra cuántas solicitudes de descuento esperan
 * respuesta y avisa en tiempo real (WebSocket) cuando llega una nueva.
 * Si el administrador no estaba conectado, al entrar ve las pendientes igual.
 */
export default function NotificacionesAutorizacion() {
  const navigate = useNavigate()
  const [pendientes, setPendientes] = useState(0)

  const cargar = useCallback(async () => {
    try {
      const data = await autorizacionesService.getPendientes()
      setPendientes(data.length)
    } catch {
      /* sin conexión: se reintenta con el próximo evento */
    }
  }, [])

  useEffect(() => {
    cargar()
    const socket = getSocket()
    const onPendiente = (evt: AutorizacionPendienteEvt) => {
      cargar()
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Solicitud de descuento',
        html: `<span style="font-size:13px">${esc(evt.solicitante || 'Un vendedor')} pide <b>Bs ${Number(evt.precioSolicitado ?? 0).toFixed(2)}</b> en la venta ${esc(evt.codigoComprobante)} (subtotal Bs ${Number(evt.subtotal).toFixed(2)}).</span>`,
        showConfirmButton: true,
        confirmButtonText: 'Revisar',
        timer: 15000,
        timerProgressBar: true,
      }).then((r) => {
        if (r.isConfirmed) navigate('/ventas?tab=autorizaciones')
      })
    }
    const onRespondida = () => cargar()
    socket.on('autorizacion-pendiente', onPendiente)
    socket.on('autorizacion-respondida', onRespondida)
    socket.on('connect', cargar)
    return () => {
      socket.off('autorizacion-pendiente', onPendiente)
      socket.off('autorizacion-respondida', onRespondida)
      socket.off('connect', cargar)
    }
  }, [cargar, navigate])

  return (
    <button
      onClick={() => navigate('/ventas?tab=autorizaciones')}
      title={pendientes ? `${pendientes} autorización(es) pendiente(s)` : 'Sin autorizaciones pendientes'}
      aria-label="Autorizaciones de descuento pendientes"
      className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {pendientes > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white">
          {pendientes}
        </span>
      )}
    </button>
  )
}
