import { Venta } from '../types'
import { esc } from '../utils/html'

interface Props {
  venta: Venta
  onClose: () => void
}

export default function TicketPrint({ venta, onClose }: Props) {
  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) { alert('Permite ventanas emergentes para imprimir'); return }
    w.document.write(`
      <html>
      <head>
        <title>Ticket ${esc(venta.codigoComprobante)}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 10px 15px; color: #000; }
          .hdr { text-align: center; margin-bottom: 10px; }
          .hdr h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
          .hdr p { font-size: 10px; color: #555; }
          .div { border-top: 1px dashed #000; margin: 8px 0; }
          .inf { font-size: 11px; margin-bottom: 8px; }
          .ir { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; }
          td { padding: 3px 0; }
          .r { text-align: right; }
          .c { text-align: center; }
          .tot { margin-top: 8px; }
          .tr { display: flex; justify-content: space-between; padding: 2px 0; }
          .tr.b { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          .ft { text-align: center; margin-top: 12px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="hdr">
          <h2>Mundo Detalles</h2>
          <p>Regalos · Cuadros · Detalles Personalizados</p>
          <p>Oruro - Bolivia</p>
          <p style="margin-top:6px;font-weight:bold;font-size:11px;color:#000;">NOTA DE VENTA</p>
          <p>Sin derecho a crédito fiscal</p>
        </div>
        <div class="div"></div>
        <div class="inf">
          <div class="ir"><span>Comprobante:</span><span>${esc(venta.codigoComprobante)}</span></div>
          <div class="ir"><span>Fecha:</span><span>${new Date(venta.createdAt).toLocaleDateString('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>
          <div class="ir"><span>Cliente:</span><span>${venta.cliente ? esc(`${venta.cliente.nombre} ${venta.cliente.apellido}`) : 'Sin cliente'}</span></div>
          <div class="ir"><span>Vendedor:</span><span>${esc(venta.usuario?.nombre)}</span></div>
          <div class="ir"><span>Pago:</span><span>${esc(venta.metodoPago || 'EFECTIVO')}</span></div>
        </div>
        <div class="div"></div>
        <table>
          <thead><tr><th>Cant</th><th>Producto</th><th class="r">Precio</th><th class="r">Subtotal</th></tr></thead>
          <tbody>
            ${(venta.detalles || []).map(d => `
              <tr><td>${d.cantidad}</td><td>${esc(d.producto?.nombre)}</td><td class="r">Bs. ${Number(d.precioUnitario).toFixed(2)}</td><td class="r">Bs. ${Number(d.subtotal).toFixed(2)}</td></tr>
            `).join('')}
          </tbody>
        </table>
        <div class="div"></div>
        <div class="tot">
          <div class="tr"><span>Subtotal:</span><span>Bs. ${Number(venta.subtotal).toFixed(2)}</span></div>
          ${Number(venta.descuento) > 0 ? `<div class="tr"><span>Descuento:</span><span>-Bs. ${Number(venta.descuento).toFixed(2)}</span></div>` : ''}
          <div class="tr b"><span>Total:</span><span>Bs. ${Number(venta.total).toFixed(2)}</span></div>
        </div>
        <div class="div"></div>
        <div class="ft">
          <p>Puntos generados: ${venta.puntosGenerados}</p>
          <p>¡Gracias por su compra!</p>
          <p style="margin-top:4px;font-size:9px;color:#999;">${venta.id}</p>
        </div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}};<\/script>
      </body>
      </html>
    `)
    w.document.close()
  }

  // Nota: la impresión NO es automática. Abrir el diálogo de impresión al vuelo
  // bloquea la app y suele ser interceptado por los bloqueadores de popups; por
  // eso se dispara con el botón "Imprimir Ticket".

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-slide-up">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Venta registrada</h3>
        <p className="text-sm text-slate-500 mb-4">La venta <strong>{venta.codigoComprobante}</strong> se registró correctamente.</p>
        <p className="text-xs text-slate-400 mb-4">Total: Bs. {Number(venta.total).toFixed(2)} · {venta.detalles?.length} producto(s)</p>
        <div className="flex gap-2 justify-center">
          <button onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
            Imprimir Ticket
          </button>
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
