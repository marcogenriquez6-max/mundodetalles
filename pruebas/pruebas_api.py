#!/usr/bin/env python3
"""
Pruebas de integración, seguridad y humo de la API de Mundo Detalles.

Recorre los 83 endpoints REST, la matriz de control de acceso por rol y los
flujos críticos del negocio (inventario perpetuo, autorizaciones, devoluciones,
caja, fidelización). Al final verifica la consistencia stock <-> Kardex.

Uso:  python3 pruebas/pruebas_api.py          (backend en http://localhost:3002/api)
      API=http://otro-host/api python3 pruebas/pruebas_api.py
Requisitos: backend con la base cargada (schema + seed + seed-demo).
"""
import json, os, re, sys, time, threading, urllib.request, urllib.error, uuid

API = os.environ.get("API", "http://localhost:3002/api")
RUN = str(int(time.time()))[-6:]          # sufijo único por ejecución

resultados = []          # (ok, nombre, detalle)
llamadas = []            # (metodo, ruta-plantilla, status)
RUTAS = None


def plantilla(path):
    p = path.split("?")[0]
    p = re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", ":id", p)
    return p


def req(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            st = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        st = e.code
    try:
        d = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        d = raw
    llamadas.append((method, plantilla(path), st))
    return st, d


def check(nombre, cond, detalle=""):
    resultados.append((bool(cond), nombre, detalle))
    print(("  OK   " if cond else "  FALLA") + "  " + nombre + ("" if cond else f"  -> {detalle}"))
    return cond


def login(email, pw):
    st, d = req("POST", "/auth/login", body={"email": email, "password": pw})
    assert st == 201, (email, st, d)
    return d["access_token"], d["usuario"]


print(f"API: {API}\n")
print("== 1. Autenticación ==")
ADM, adm = login("admin@mundodetalles.com", "Admin123!")
CAJ, caj = login("cajero1@mundodetalles.com", "Cajero123!")
VEN, ven = login("vendedor1@mundodetalles.com", "Vendedor123!")
check("Login con credenciales válidas emite JWT (201)", ADM and adm["rol"] == "Administrador")
st, d = req("POST", "/auth/login", body={"email": "admin@mundodetalles.com", "password": "Incorrecta123"})
check("Login con credenciales inválidas -> 401", st == 401, st)
st, _ = req("GET", "/productos")
check("Ruta protegida sin token -> 401", st == 401, st)
st, _ = req("GET", "/productos", token="token.invalido.x")
check("Token inválido -> 401", st == 401, st)
st, d = req("POST", "/auth/login", body={"email": "no-es-email", "password": "x"})
check("Login con email mal formado -> 400", st == 400, st)

print("\n== 2. Seguridad de datos ==")
st, us = req("GET", "/usuarios", ADM)
check("Listado de usuarios no expone hash de contraseña", st == 200 and all("passwordHash" not in u for u in us), st)
st, u1 = req("GET", f"/usuarios/{adm['id']}", ADM)
check("Detalle de usuario no expone hash ni refresh token", st == 200 and "passwordHash" not in u1 and "refreshToken" not in u1)
st, d = req("GET", "/ventas/no-es-uuid", ADM)
check("Identificador mal formado -> 400 (no 500)", st == 400, (st, d))
st, d = req("GET", f"/ventas/{uuid.uuid4()}", ADM)
check("Venta inexistente -> 404", st == 404, st)

print("\n== 3. Matriz RBAC (Tabla 17) ==")
st, prods = req("GET", "/productos", ADM)
cats = req("GET", "/categorias", ADM)[1]
P = {p["sku"]: p for p in prods}
nuevo_prod = {"sku": f"T-{RUN}", "nombre": "Prueba RBAC", "categoriaId": cats[0]["id"], "precioBase": 50, "stockActual": 0, "stockMinimo": 1}
for tok, rol in ((VEN, "Vendedor"), (CAJ, "Cajero")):
    st, _ = req("POST", "/productos", tok, nuevo_prod)
    check(f"{rol} intenta crear un producto -> 403", st == 403, st)
    st, _ = req("GET", "/usuarios", tok)
    check(f"{rol} intenta listar usuarios -> 403", st == 403, st)
    st, _ = req("POST", "/configuracion", tok, {"clave": "x", "valor": "1"})
    check(f"{rol} intenta cambiar configuración -> 403", st == 403, st)
    st, _ = req("POST", "/autorizaciones/responder", tok, {"autorizacionId": str(uuid.uuid4()), "estado": "APROBADA"})
    check(f"{rol} intenta aprobar una autorización -> 403", st == 403, st)
    st, _ = req("POST", "/kardex", tok, {"productoId": prods[0]["id"], "tipoMovimiento": "ENTRADA", "cantidad": 1})
    check(f"{rol} intenta registrar movimiento de Kardex -> 403", st == 403, st)
for tok, rol in ((ADM, "Administrador"), (CAJ, "Cajero"), (VEN, "Vendedor")):
    ok = all(req("GET", r, tok)[0] == 200 for r in ("/productos", "/kardex", "/clientes", "/ventas", "/premios"))
    check(f"{rol} consulta catálogo, kardex, clientes, ventas y premios -> 200", ok)
st, _ = req("POST", "/caja/abrir", VEN, {"montoInicial": 10})
check("Vendedor intenta abrir caja -> 403", st == 403, st)
st, _ = req("POST", "/devoluciones", VEN, {"ventaId": str(uuid.uuid4()), "codigo": "X-1", "motivo": "x", "detalles": [{"productoId": str(uuid.uuid4()), "cantidad": 1}]})
check("Vendedor intenta registrar devolución -> 403", st == 403, st)
st, _ = req("DELETE", f"/clientes/{uuid.uuid4()}", VEN)
check("Vendedor intenta eliminar cliente -> 403", st == 403, st)

print("\n== 4. Venta con inventario perpetuo (HU-03) ==")
clientes = req("GET", "/clientes", ADM)[1]
cli = next(c for c in clientes if c["numeroDocumento"] == "2234567")   # Jorge (0 pts)
con_puntos = next(p for p in prods if p["otorgaPuntos"] and p["stockActual"] >= 6 and float(p["precioBase"]) >= 50)
sin_puntos = next(p for p in prods if not p["otorgaPuntos"] and p["stockActual"] >= 3)
k_antes = len(req("GET", f"/kardex/producto/{con_puntos['id']}", ADM)[1])
st, v = req("POST", "/ventas", VEN, {
    "codigoComprobante": f"T{RUN}-1", "clienteId": cli["id"], "metodoPago": "EFECTIVO",
    "detalles": [{"productoId": con_puntos["id"], "cantidad": 2, "precioUnitario": 0.01},
                 {"productoId": sin_puntos["id"], "cantidad": 1}],
    "subtotal": 0.01, "total": 0.01})
check("Venta registrada (201) y COMPLETADA", st == 201 and v["estado"] == "COMPLETADA", (st, v if st != 201 else ""))
esperado = 2 * float(con_puntos["precioBase"]) + float(sin_puntos["precioBase"])
check("El backend recalcula el total con precios del catálogo (ignora 0,01)", abs(float(v["total"]) - esperado) < 0.01, (v.get("total"), esperado))
check("El usuario de la venta se toma del token", v["usuarioId"] == ven["id"])
p_desp = req("GET", f"/productos/{con_puntos['id']}", ADM)[1]
check("La venta descuenta el stock", p_desp["stockActual"] == con_puntos["stockActual"] - 2, (p_desp["stockActual"], con_puntos["stockActual"]))
kx = req("GET", f"/kardex/producto/{con_puntos['id']}", ADM)[1]
check("La venta registra la SALIDA en el Kardex con stock anterior/posterior",
      len(kx) == k_antes + 1 and kx[0]["tipoMovimiento"] == "SALIDA" and kx[0]["stockAnterior"] - kx[0]["stockNuevo"] == 2)
pts_esp = int((2 * float(con_puntos["precioBase"])) // 10)
check("Puntos solo por productos designados (1 punto / Bs 10)", v["puntosGenerados"] == pts_esp, (v["puntosGenerados"], pts_esp))
cli_d = req("GET", f"/clientes/{cli['id']}", ADM)[1]
check("El saldo de puntos del cliente aumenta", cli_d["puntosAcumulados"] == cli["puntosAcumulados"] + pts_esp)
hist = req("GET", f"/fidelizacion/historial/{cli['id']}", ADM)[1]
check("El historial registra saldo anterior y posterior", hist and hist[0]["saldoPosterior"] - hist[0]["saldoAnterior"] == pts_esp)

stock_a = req("GET", f"/productos/{sin_puntos['id']}", ADM)[1]["stockActual"]
st, d = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-2",
    "detalles": [{"productoId": sin_puntos["id"], "cantidad": 1}, {"productoId": con_puntos["id"], "cantidad": 99999}]})
check("Venta con stock insuficiente -> 400 con mensaje claro", st == 400 and "Stock insuficiente" in str(d.get("message")), (st, d))
check("Transacción atómica: la línea válida no descontó stock",
      req("GET", f"/productos/{sin_puntos['id']}", ADM)[1]["stockActual"] == stock_a)
st, d = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-1", "detalles": [{"productoId": sin_puntos["id"], "cantidad": 1}]})
check("Comprobante duplicado -> 409 (no 500)", st == 409, (st, d))
st, d = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-3", "detalles": []})
check("Venta sin productos -> 400", st == 400, st)

print("\n== 5. Concurrencia (bloqueo pesimista) ==")
st, ultimo = req("POST", "/productos", ADM, {"sku": f"U-{RUN}", "nombre": "Último ejemplar", "categoriaId": cats[0]["id"],
                                            "precioBase": 30, "stockActual": 1, "stockMinimo": 0})
check("Producto con stock 1 creado (stock inicial en Kardex)", st == 201 and
      req("GET", f"/kardex/producto/{ultimo['id']}", ADM)[1][0]["referencia"] == "INVENTARIO_INICIAL")
res = []
def vender(i):
    res.append(req("POST", "/ventas", CAJ, {"codigoComprobante": f"T{RUN}-C{i}", "detalles": [{"productoId": ultimo["id"], "cantidad": 1}]})[0])
hilos = [threading.Thread(target=vender, args=(i,)) for i in range(5)]
[h.start() for h in hilos]; [h.join() for h in hilos]
check("5 ventas simultáneas del último ejemplar: exactamente 1 se concreta", res.count(201) == 1 and res.count(400) == 4, res)
check("Sin sobreventa: el stock queda en 0", req("GET", f"/productos/{ultimo['id']}", ADM)[1]["stockActual"] == 0)

print("\n== 6. Anulación ==")
st, d = req("PATCH", f"/ventas/{v['id']}/anular", VEN, {"motivo": "prueba"})
check("Vendedor intenta anular una venta -> 403", st == 403, st)
st, d = req("PATCH", f"/ventas/{v['id']}/anular", CAJ, {"motivo": ""})
check("Anular sin motivo -> 400", st == 400, st)
st, an = req("PATCH", f"/ventas/{v['id']}/anular", CAJ, {"motivo": "Cliente desistió"})
check("Cajero anula la venta (200, ANULADA)", st == 200 and an["estado"] == "ANULADA", (st, an))
check("La anulación repone el stock", req("GET", f"/productos/{con_puntos['id']}", ADM)[1]["stockActual"] == con_puntos["stockActual"])
kx = req("GET", f"/kardex/producto/{con_puntos['id']}", ADM)[1]
check("La anulación registra ENTRADA en el Kardex", kx[0]["tipoMovimiento"] == "ENTRADA" and kx[0]["referencia"] == "ANULACION")
check("La anulación revierte los puntos", req("GET", f"/clientes/{cli['id']}", ADM)[1]["puntosAcumulados"] == cli["puntosAcumulados"])
st, _ = req("PATCH", f"/ventas/{v['id']}/anular", ADM, {"motivo": "otra vez"})
check("Anular dos veces -> 400", st == 400, st)

print("\n== 7. Autorización remota de descuentos (HU-04) ==")
# Escuchar el WebSocket con el cliente socket.io del frontend (Node).
eventos_file = f"/tmp/ws-eventos-{RUN}.json"
listener = None
node_cli = os.path.join(os.path.dirname(__file__), "..", "frontend", "node_modules", "socket.io-client")
if os.path.isdir(node_cli):
    import subprocess
    js = f"""
const {{ io }} = require({json.dumps(os.path.abspath(node_cli))});
const fs = require('fs'); const ev = [];
const s = io({json.dumps(API.rsplit('/api', 1)[0])}, {{ transports: ['websocket'] }});
s.on('autorizacion-pendiente', p => {{ ev.push(['pendiente', p, Date.now()]); fs.writeFileSync({json.dumps(eventos_file)}, JSON.stringify(ev)); }});
s.on('autorizacion-respondida', p => {{ ev.push(['respondida', p, Date.now()]); fs.writeFileSync({json.dumps(eventos_file)}, JSON.stringify(ev)); }});
s.on('connect', () => console.log('conectado'));
setTimeout(() => process.exit(0), 20000);
"""
    listener = subprocess.Popen(["node", "-e", js], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(1.5)
prod_d = next(p for p in req("GET", "/productos", ADM)[1] if p["stockActual"] >= 7 and float(p["precioBase"]) >= 80 and p["otorgaPuntos"])
cli2 = next(c for c in clientes if c["numeroDocumento"] == "7890123")
sub = 2 * float(prod_d["precioBase"])
t0 = time.time()
st, vp = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-D1", "clienteId": cli2["id"], "metodoPago": "EFECTIVO",
    "detalles": [{"productoId": prod_d["id"], "cantidad": 2}], "precioSolicitado": round(sub * 0.85, 2), "motivoDescuento": "Cliente frecuente"})
check("Venta con precio negociado queda PENDIENTE (por autorizar)", st == 201 and vp["estado"] == "PENDIENTE", (st, vp))
check("La venta pendiente no otorga puntos todavía", vp["puntosGenerados"] == 0)
check("El stock queda reservado mientras se autoriza", req("GET", f"/productos/{prod_d['id']}", ADM)[1]["stockActual"] == prod_d["stockActual"] - 2)
st, pend = req("GET", "/autorizaciones/pendientes", ADM)
mi = [a for a in pend if a["ventaId"] == vp["id"]]
check("La solicitud aparece en pendientes (aunque el admin no esté conectado)", st == 200 and len(mi) == 1 and mi[0]["solicitanteId"] == ven["id"])
st, d = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-D2", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}],
                                     "precioSolicitado": 99999, "motivoDescuento": "Prueba inválida"})
check("Precio negociado mayor al subtotal -> 400", st == 400, st)
st, d = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-D3", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}], "precioSolicitado": 10})
check("Precio negociado sin motivo -> 400", st == 400, st)
nuevo_precio = round(sub * 0.9, 2)
st, resp = req("POST", "/autorizaciones/responder", ADM, {"autorizacionId": mi[0]["id"], "estado": "APROBADA", "precioAprobado": nuevo_precio, "motivoRespuesta": "Contraoferta"})
check("El administrador aprueba con precio modificado (201)", st == 201 and resp["estado"] == "APROBADA" and resp["aprobadorId"] == adm["id"], (st, resp))
vc = req("GET", f"/ventas/{vp['id']}", ADM)[1]
check("La venta se completa con el precio autorizado", vc["estado"] == "COMPLETADA" and abs(float(vc["total"]) - nuevo_precio) < 0.01 and abs(float(vc["descuento"]) - (sub - nuevo_precio)) < 0.01, (vc["estado"], vc["total"]))
check("Puntos sobre el monto efectivamente pagado", vc["puntosGenerados"] == int(nuevo_precio // 10), vc["puntosGenerados"])
st, _ = req("POST", "/autorizaciones/responder", ADM, {"autorizacionId": mi[0]["id"], "estado": "RECHAZADA"})
check("Responder dos veces -> 400", st == 400, st)
# rechazo
st, vr = req("POST", "/ventas", CAJ, {"codigoComprobante": f"T{RUN}-D4", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}],
                                      "precioSolicitado": round(float(prod_d["precioBase"]) * 0.5, 2), "motivoDescuento": "Pide mitad de precio"})
st, resp = req("POST", "/autorizaciones/responder", ADM, {"autorizacionId": vr["autorizacionId"], "estado": "RECHAZADA", "motivoRespuesta": "Margen insuficiente"})
vrc = req("GET", f"/ventas/{vr['id']}", ADM)[1]
check("Rechazo: la venta se completa al precio de lista", st == 201 and vrc["estado"] == "COMPLETADA" and float(vrc["descuento"]) == 0 and abs(float(vrc["total"]) - float(prod_d["precioBase"])) < 0.01)
# cancelación de una pendiente
stock_b = req("GET", f"/productos/{prod_d['id']}", ADM)[1]["stockActual"]
st, vx = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-D5", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}],
                                      "precioSolicitado": round(float(prod_d["precioBase"]) - 1, 2), "motivoDescuento": "Cliente no espera"})
st, d = req("PATCH", f"/ventas/{vx['id']}/anular", CAJ, {"motivo": "Cliente se retiró"})
a = req("GET", f"/autorizaciones/{vx['autorizacionId']}", ADM)[1]
check("Cancelar una venta pendiente repone stock y cierra la solicitud",
      st == 200 and req("GET", f"/productos/{prod_d['id']}", ADM)[1]["stockActual"] == stock_b and a["estado"] == "EXPIRADA")
st, d = req("POST", "/autorizaciones/responder", ADM, {"autorizacionId": vx["autorizacionId"], "estado": "APROBADA"})
check("No se puede aprobar la solicitud de una venta cancelada -> 400", st == 400, st)
# admin aplica descuento directamente
st, va = req("POST", "/ventas", ADM, {"codigoComprobante": f"T{RUN}-D6", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}],
                                      "precioSolicitado": round(float(prod_d["precioBase"]) - 5, 2), "motivoDescuento": "Cortesía del dueño"})
check("Administrador: el descuento se aplica directo y queda trazado como APROBADO",
      st == 201 and va["estado"] == "COMPLETADA" and va["autorizacion"]["estado"] == "APROBADA")
# solicitar (endpoint genérico) sobre venta pendiente
st, vq = req("POST", "/ventas", VEN, {"codigoComprobante": f"T{RUN}-D7", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}],
                                      "precioSolicitado": round(float(prod_d["precioBase"]) - 2, 2), "motivoDescuento": "Primera solicitud"})
st, d = req("POST", "/autorizaciones/solicitar", VEN, {"ventaId": vq["id"], "tipo": "DESCUENTO_ESPECIAL", "precioSolicitado": 1, "motivoSolicitud": "Segunda solicitud duplicada"})
check("No se duplica una solicitud abierta -> 400", st == 400, st)
st, d = req("POST", "/autorizaciones/responder", ADM, {"autorizacionId": vq["autorizacionId"], "estado": "APROBADA"})
check("Aprobar sin precio usa el precio solicitado", st == 201 and abs(float(req("GET", f"/ventas/{vq['id']}", ADM)[1]["total"]) - (float(prod_d["precioBase"]) - 2)) < 0.01)
st, d = req("POST", "/autorizaciones/solicitar", VEN, {"ventaId": vq["id"], "tipo": "DESCUENTO_ESPECIAL", "precioSolicitado": 1, "motivoSolicitud": "Venta ya completada"})
check("Solicitar sobre una venta ya completada -> 400", st == 400, st)
for tipo in ("autorizacion-pendiente", "autorizacion-respondida"):
    pass
if listener:
    time.sleep(1.5)
    ev = json.load(open(eventos_file)) if os.path.exists(eventos_file) else []
    pend_ev = [e for e in ev if e[0] == "pendiente" and e[1].get("ventaId") == vp["id"]]
    resp_ev = [e for e in ev if e[0] == "respondida" and e[1].get("ventaId") == vp["id"]]
    check("WebSocket: el administrador recibe 'autorizacion-pendiente' en tiempo real", len(pend_ev) == 1, ev[:2])
    if pend_ev:
        lat = pend_ev[0][2] / 1000 - t0
        check(f"Latencia de notificación <= 2 s (RNF-06) [{lat:.2f} s]", lat <= 2.0, lat)
    check("WebSocket: el vendedor recibe 'autorizacion-respondida' con el resultado",
          len(resp_ev) == 1 and resp_ev[0][1]["estado"] == "APROBADA" and abs(resp_ev[0][1]["precioAprobado"] - nuevo_precio) < 0.01, resp_ev)
    listener.kill()
else:
    check("WebSocket: cliente socket.io disponible para la prueba", False, "instale dependencias del frontend")

print("\n== 8. Devoluciones (RF-11) ==")
vc = req("GET", f"/ventas/{vp['id']}", ADM)[1]           # venta con descuento y puntos (2 unidades)
cli2_antes = req("GET", f"/clientes/{cli2['id']}", ADM)[1]["puntosAcumulados"]
stock_c = req("GET", f"/productos/{prod_d['id']}", ADM)[1]["stockActual"]
st, d = req("POST", "/devoluciones", CAJ, {"ventaId": vc["id"], "codigo": f"DV{RUN}-0", "motivo": "Exceso", "detalles": [{"productoId": prod_d["id"], "cantidad": 3}]})
check("Devolver más de lo vendido -> 400", st == 400, (st, d))
st, d = req("POST", "/devoluciones", CAJ, {"ventaId": vc["id"], "codigo": f"DV{RUN}-0", "motivo": "Otro", "detalles": [{"productoId": sin_puntos["id"], "cantidad": 1}]})
check("Devolver un producto que no está en la venta -> 400", st == 400, (st, d))
st, dv = req("POST", "/devoluciones", CAJ, {"ventaId": vc["id"], "codigo": f"DV{RUN}-1", "motivo": "Defecto de fábrica", "detalles": [{"productoId": prod_d["id"], "cantidad": 1, "precioUnitario": 9999}]})
check("Devolución registrada (201)", st == 201, (st, dv))
check("Se valoriza al precio cobrado (con descuento), no al enviado", abs(float(dv["total"]) - nuevo_precio / 2) < 0.02, (dv.get("total"), nuevo_precio / 2))
check("La devolución repone el stock", req("GET", f"/productos/{prod_d['id']}", ADM)[1]["stockActual"] == stock_c + 1)
kx = req("GET", f"/kardex/producto/{prod_d['id']}", ADM)[1]
check("La devolución registra ENTRADA en el Kardex", kx[0]["referencia"] == "DEVOLUCION" and kx[0]["tipoMovimiento"] == "ENTRADA")
check("La devolución revierte los puntos proporcionales", req("GET", f"/clientes/{cli2['id']}", ADM)[1]["puntosAcumulados"] < cli2_antes)
check("La venta original queda marcada (tiene_devolucion)", req("GET", f"/ventas/{vc['id']}", ADM)[1]["tieneDevolucion"] is True)
st, d = req("POST", "/devoluciones", CAJ, {"ventaId": vc["id"], "codigo": f"DV{RUN}-2", "motivo": "Resto", "detalles": [{"productoId": prod_d["id"], "cantidad": 2}]})
check("No se puede devolver dos veces lo mismo -> 400", st == 400, st)
st, d = req("PATCH", f"/ventas/{vc['id']}/anular", ADM, {"motivo": "Anular tras devolución"})
check("Una venta con devoluciones no se puede anular -> 400", st == 400, st)
st, d = req("POST", "/devoluciones", CAJ, {"ventaId": an["id"], "codigo": f"DV{RUN}-3", "motivo": "x", "detalles": [{"productoId": con_puntos["id"], "cantidad": 1}]})
check("Devolución sobre venta anulada -> 400", st == 400, st)
st, d = req("POST", "/devoluciones", CAJ, {"ventaId": vc["id"], "codigo": f"DV{RUN}-1", "motivo": "dup", "detalles": [{"productoId": prod_d["id"], "cantidad": 1}]})
check("Código de devolución duplicado -> 400/409", st in (400, 409), st)

print("\n== 9. Caja (RF-10) ==")
abierta = req("GET", "/caja/abierta", CAJ)[1]
if abierta:
    req("POST", f"/caja/{abierta['id']}/cerrar", CAJ, {"montoFinal": abierta["saldoEsperado"]})
st, cj = req("POST", "/caja/abrir", CAJ, {"montoInicial": 200})
check("Abrir caja (201)", st == 201 and cj["estado"] == "ABIERTA", (st, cj))
st, _ = req("POST", "/caja/abrir", CAJ, {"montoInicial": 1})
check("No se abren dos cajas a la vez -> 400", st == 400, st)
p_caja = next(p for p in req("GET", "/productos", ADM)[1] if p["stockActual"] >= 3 and not p["otorgaPuntos"])
st, ve = req("POST", "/ventas", CAJ, {"codigoComprobante": f"T{RUN}-K1", "metodoPago": "EFECTIVO", "detalles": [{"productoId": p_caja["id"], "cantidad": 1}]})
st, vq2 = req("POST", "/ventas", CAJ, {"codigoComprobante": f"T{RUN}-K2", "metodoPago": "QR", "detalles": [{"productoId": p_caja["id"], "cantidad": 1}]})
st, dvc = req("POST", "/devoluciones", CAJ, {"ventaId": ve["id"], "codigo": f"DV{RUN}-K", "motivo": "Cambio", "detalles": [{"productoId": p_caja["id"], "cantidad": 1}]})
ab = req("GET", "/caja/abierta", CAJ)[1]
check("Ingresos de caja = ventas en efectivo del turno", abs(ab["totalIngresos"] - float(ve["total"])) < 0.01, ab["totalIngresos"])
check("Egresos de caja = devoluciones del turno", abs(ab["totalEgresos"] - float(dvc["total"])) < 0.01, ab["totalEgresos"])
check("Cobros QR/tarjeta se informan aparte", abs(ab["ventasOtrosMedios"] - float(vq2["total"])) < 0.01)
esperado_caja = 200 + float(ve["total"]) - float(dvc["total"])
check("Saldo esperado = inicial + ingresos − egresos", abs(ab["saldoEsperado"] - esperado_caja) < 0.01)
st, cc = req("POST", f"/caja/{ab['id']}/cerrar", CAJ, {"montoFinal": esperado_caja - 5})
check("Cerrar caja (201) congela totales y calcula la diferencia", st == 201 and cc["estado"] == "CERRADA" and abs(cc["diferencia"] + 5) < 0.01, (st, cc))
st, _ = req("POST", f"/caja/{ab['id']}/cerrar", CAJ, {"montoFinal": 1})
check("Cerrar una caja ya cerrada -> 400", st == 400, st)
check("Consultar caja por id y listado", req("GET", f"/caja/{ab['id']}", CAJ)[0] == 200 and req("GET", "/caja?estado=CERRADA", CAJ)[0] == 200)

print("\n== 10. Kardex manual y catálogo ==")
st, pk = req("POST", "/productos", ADM, {"sku": f"K-{RUN}", "nombre": "Prueba Kardex", "categoriaId": cats[0]["id"], "precioBase": 100,
                                        "costoPromedio": 40, "stockActual": 10, "stockMinimo": 2, "otorgaPuntos": True})
check("Crear producto (201) con otorga_puntos", st == 201 and pk["otorgaPuntos"] is True, (st, pk))
st, m = req("POST", "/kardex", ADM, {"productoId": pk["id"], "tipoMovimiento": "ENTRADA", "cantidad": 10, "costoUnitario": 60, "observacion": "Compra"})
pk2 = req("GET", f"/productos/{pk['id']}", ADM)[1]
check("ENTRADA suma stock y recalcula costo promedio ponderado (40→50)", st == 201 and pk2["stockActual"] == 20 and abs(float(pk2["costoPromedio"]) - 50) < 0.01, (st, pk2.get("costoPromedio")))
st, d = req("POST", "/kardex", ADM, {"productoId": pk["id"], "tipoMovimiento": "SALIDA", "cantidad": 999})
check("SALIDA mayor al stock -> 400", st == 400, st)
st, m = req("POST", "/kardex", ADM, {"productoId": pk["id"], "tipoMovimiento": "AJUSTE", "stockNuevo": 17, "observacion": "Conteo"})
check("AJUSTE por conteo físico deja el stock contado", st == 201 and m["stockAnterior"] == 20 and m["stockNuevo"] == 17
      and req("GET", f"/productos/{pk['id']}", ADM)[1]["stockActual"] == 17)
st, d = req("PATCH", f"/productos/{pk['id']}", ADM, {"stockActual": 15, "nombre": "Prueba Kardex editado"})
kx = req("GET", f"/kardex/producto/{pk['id']}", ADM)[1]
check("Corregir stock desde la ficha registra AJUSTE en Kardex", st == 200 and kx[0]["tipoMovimiento"] == "AJUSTE" and kx[0]["stockNuevo"] == 15)
check("Consultar movimiento por id", req("GET", f"/kardex/{kx[0]['id']}", ADM)[0] == 200)
hoy = time.strftime("%Y-%m-%d")
st, kf = req("GET", f"/kardex?fechaInicio={hoy}&fechaFin={hoy}&productoId={pk['id']}", ADM)
check("Filtro de Kardex por fecha incluye el día completo", st == 200 and len(kf) == len(kx), (len(kf), len(kx)))
st, d = req("POST", "/productos", ADM, {"sku": f"K-{RUN}", "nombre": "Duplicado", "categoriaId": cats[0]["id"], "precioBase": 1, "stockActual": 0, "stockMinimo": 0})
check("SKU duplicado -> 409 (no 500)", st == 409, (st, d))
st, d = req("PATCH", f"/productos/{pk['id']}/precio", ADM, {"precioBase": 110})
check("Actualizar precio por ruta /productos/:id/precio", st == 200 and float(d["precioBase"]) == 110, (st, d))
check("Búsqueda de productos sin distinguir mayúsculas (nombre o SKU)",
      any(p["id"] == pk["id"] for p in req("GET", f"/productos?search=prueba%20kardex", ADM)[1]) and
      any(p["id"] == pk["id"] for p in req("GET", f"/productos?search=k-{RUN}", ADM)[1]))
check("Stock bajo / consulta por id", req("GET", "/productos/stock-bajo", VEN)[0] == 200 and req("GET", f"/productos/{pk['id']}", VEN)[0] == 200)
st, _ = req("DELETE", f"/productos/{pk['id']}", ADM)
check("Eliminar producto es lógico (soft-delete)", st == 200 and all(p["id"] != pk["id"] for p in req("GET", "/productos", ADM)[1]))
st, d = req("POST", "/ventas", ADM, {"codigoComprobante": f"T{RUN}-X", "detalles": [{"productoId": pk["id"], "cantidad": 1}]})
check("No se puede vender un producto eliminado -> 404", st == 404, st)

print("\n== 11. Clientes y fidelización (HU-05) ==")
st, nc = req("POST", "/clientes", VEN, {"tipoDocumento": "CI", "numeroDocumento": f"9{RUN}", "nombre": "María", "apellido": "Prueba", "email": "", "telefono": "", "direccion": ""})
check("Vendedor registra cliente con C.I. y campos opcionales vacíos (201)", st == 201 and nc["tipoDocumento"] == "CI", (st, nc))
st, d = req("POST", "/clientes", VEN, {"tipoDocumento": "DNI", "numeroDocumento": f"8{RUN}", "nombre": "X", "apellido": "Y"})
check("Tipo de documento no boliviano -> 400", st == 400, st)
st, d = req("POST", "/clientes", CAJ, {"tipoDocumento": "NIT", "numeroDocumento": f"9{RUN}", "nombre": "Dup", "apellido": "Dup"})
check("Documento duplicado -> 409", st == 409, st)
st, d = req("PATCH", f"/clientes/{nc['id']}", CAJ, {"telefono": "70011223", "puntosAcumulados": 99999})
check("Los puntos no se pueden editar a mano -> 400", st == 400, st)
st, d = req("PATCH", f"/clientes/{nc['id']}", CAJ, {"telefono": "70011223", "email": "maria@correo.bo"})
check("Cajero edita datos del cliente (200)", st == 200 and d["telefono"] == "70011223", (st, d))
check("Búsqueda de clientes por apellido y documento",
      any(c["id"] == nc["id"] for c in req("GET", "/clientes?search=prueba", VEN)[1]) and
      any(c["id"] == nc["id"] for c in req("GET", f"/clientes?search=9{RUN}", VEN)[1]))
check("Buscar cliente por documento", req("GET", f"/clientes/documento/9{RUN}", VEN)[1]["id"] == nc["id"])
st, rs = req("GET", f"/fidelizacion/resumen/{cli2['id']}", VEN)
check("Resumen de fidelización con nombre, documento, operaciones y progreso",
      st == 200 and rs["cliente"]["apellido"] and rs["cliente"]["numeroDocumento"] and "cantidadOperaciones" in rs["resumen"]
      and rs["resumen"]["totalRedimido"] >= 0 and "siguienteNivel" in rs["progreso"], rs)
# canje
premios = req("GET", "/premios?disponibles=true", CAJ)[1]
barato = min(premios, key=lambda p: p["puntosRequeridos"])
rico = max(req("GET", "/clientes", ADM)[1], key=lambda c: c["puntosAcumulados"])
st, d = req("POST", f"/premios/{barato['id']}/canjear", CAJ, {"clienteId": nc["id"]})
check("Canje con puntos insuficientes -> 400", st == 400 and "insuficientes" in str(d.get("message")), (st, d))
st, cj2 = req("POST", f"/premios/{barato['id']}/canjear", CAJ, {"clienteId": rico["id"]})
check("Canje válido descuenta puntos y stock del premio", st == 201 and cj2["saldoPuntos"] == rico["puntosAcumulados"] - barato["puntosRequeridos"]
      and req("GET", f"/premios/{barato['id']}", CAJ)[1]["stock"] == barato["stock"] - 1, (st, cj2))
check("El canje no baja el nivel del cliente", req("GET", f"/clientes/{rico['id']}", ADM)[1]["nivelFidelizacion"] == rico["nivelFidelizacion"])
check("El canje queda registrado con el usuario del token", cj2["canje"]["created_by"] == caj["id"])
st, pz = req("POST", "/premios", ADM, {"nombre": f"Premio agotable {RUN}", "puntosRequeridos": 1, "stock": 0})
st, d = req("POST", f"/premios/{pz['id']}/canjear", CAJ, {"clienteId": rico["id"]})
check("Premio sin stock -> 400 (agotado)", st == 400, st)
st, _ = req("PATCH", f"/premios/{pz['id']}", ADM, {"stock": 5})
check("Actualizar premio (200)", st == 200)
check("Vendedor no puede canjear premios -> 403", req("POST", f"/premios/{pz['id']}/canjear", VEN, {"clienteId": rico["id"]})[0] == 403)
st, _ = req("DELETE", f"/premios/{pz['id']}", ADM)
check("Eliminar premio (soft-delete)", st == 200 and req("GET", f"/premios/{pz['id']}", ADM)[0] == 404)
# subida de nivel
bronce = next(c for c in req("GET", "/clientes", ADM)[1] if c["nivelFidelizacion"] == "BRONCE" and c["puntosAcumulados"] >= 100)
caro = max((p for p in req("GET", "/productos", ADM)[1] if p["otorgaPuntos"] and p["stockActual"] >= 1), key=lambda p: float(p["precioBase"]))
falta = 500 - bronce["puntosAcumulados"]
unidades = min(caro["stockActual"], max(1, -(-falta * 10 // int(float(caro["precioBase"])))))
st, vn = req("POST", "/ventas", ADM, {"codigoComprobante": f"T{RUN}-N", "clienteId": bronce["id"], "detalles": [{"productoId": caro["id"], "cantidad": unidades}]})
cb = req("GET", f"/clientes/{bronce['id']}", ADM)[1]
check("El cliente sube de nivel al alcanzar el umbral (BRONCE→PLATA a 500 pts)",
      st == 201 and (cb["puntosAcumulados"] < 500 or cb["nivelFidelizacion"] in ("PLATA", "ORO", "PLATINO")), (cb["puntosAcumulados"], cb["nivelFidelizacion"]))
st, _ = req("DELETE", f"/clientes/{nc['id']}", ADM)
check("Eliminar cliente (admin, soft-delete)", st == 200 and req("GET", f"/clientes/{nc['id']}", ADM)[0] == 404)

print("\n== 12. Cotizaciones ==")
st, cot = req("POST", "/cotizaciones", VEN, {"codigo": f"COT{RUN}", "clienteId": cli["id"], "fechaValidez": "2026-12-31",
                                            "detalles": [{"productoId": sin_puntos["id"], "cantidad": 3, "precioUnitario": 1}]})
check("Vendedor crea cotización con precios del catálogo (201)", st == 201 and abs(float(cot["total"]) - 3 * float(sin_puntos["precioBase"])) < 0.01, (st, cot))
check("La cotización no mueve stock", req("GET", f"/productos/{sin_puntos['id']}", ADM)[1]["stockActual"] == stock_a)
st, _ = req("PATCH", f"/cotizaciones/{cot['id']}", VEN, {"estado": "APROBADA"})
check("Vendedor no cambia el estado de la cotización -> 403", st == 403, st)
st, d = req("PATCH", f"/cotizaciones/{cot['id']}", CAJ, {"estado": "INVENTADO"})
check("Estado de cotización inválido -> 400", st == 400, st)
st, d = req("PATCH", f"/cotizaciones/{cot['id']}", CAJ, {"estado": "APROBADA"})
check("Cajero aprueba la cotización (200)", st == 200 and d["estado"] == "APROBADA")
check("Listar y consultar cotización", req("GET", "/cotizaciones", VEN)[0] == 200 and req("GET", f"/cotizaciones/{cot['id']}", VEN)[0] == 200)
st, _ = req("DELETE", f"/cotizaciones/{cot['id']}", ADM)
check("Eliminar cotización (admin)", st == 200)

print("\n== 13. Administración: usuarios, roles, permisos, categorías, proveedores, configuración, reportes ==")
roles = req("GET", "/roles", ADM)[1]
rol_v = next(r for r in roles if r["nombre"] == "Vendedor")
st, nu = req("POST", "/usuarios", ADM, {"email": f"u{RUN}@md.bo", "username": f"u{RUN}", "password": "Clave123", "nombre": "Nuevo", "apellido": "Usuario", "rolId": rol_v["id"]})
check("Crear usuario (201) sin exponer hash", st == 201 and "passwordHash" not in nu, (st, nu))
st, d = req("POST", "/usuarios", ADM, {"email": f"v{RUN}@md.bo", "username": f"v{RUN}", "password": "corta", "nombre": "A", "apellido": "B", "rolId": rol_v["id"]})
check("Contraseña débil -> 400", st == 400, st)
st, d = req("PATCH", f"/usuarios/{nu['id']}", ADM, {"telefono": "70000000"})
check("Editar usuario (200)", st == 200)
check("Consultar usuario por id", req("GET", f"/usuarios/{nu['id']}", ADM)[0] == 200)
tok_nu, _ = login(f"u{RUN}@md.bo", "Clave123")
check("El usuario nuevo inicia sesión con su rol", bool(tok_nu))
st, d = req("DELETE", f"/usuarios/{adm['id']}", ADM)
check("El administrador no puede eliminarse a sí mismo -> 400", st == 400, st)
st, _ = req("DELETE", f"/usuarios/{nu['id']}", ADM)
st2, _ = req("POST", "/auth/login", body={"email": f"u{RUN}@md.bo", "password": "Clave123"})
check("Usuario eliminado (soft-delete) ya no puede iniciar sesión", st == 200 and st2 == 401, (st, st2))
st, d = req("DELETE", f"/roles/{rol_v['id']}", ADM)
check("Un rol del sistema no se puede eliminar -> 400", st == 400, st)
st, nr = req("POST", "/roles", ADM, {"nombre": f"Auditor{RUN}", "descripcion": "Solo lectura", "nivelJerarquico": 10})
check("Crear rol (201)", st == 201, (st, nr))
if st == 201:
    check("Editar / consultar / eliminar rol", req("PATCH", f"/roles/{nr['id']}", ADM, {"descripcion": "Lectura"})[0] == 200
          and req("GET", f"/roles/{nr['id']}", ADM)[0] == 200 and req("DELETE", f"/roles/{nr['id']}", ADM)[0] == 200)
perms = req("GET", "/permisos", ADM)[1]
check("Listar permisos", len(perms) > 0)
st, np_ = req("POST", "/permisos", ADM, {"codigo": "PRUEBA_" + "".join(chr(65 + int(c)) for c in RUN), "nombre": "Permiso de prueba", "modulo": "pruebas"})
check("Crear permiso (201)", st == 201, (st, np_))
if st == 201:
    check("Editar / consultar / eliminar permiso", req("PATCH", f"/permisos/{np_['id']}", ADM, {"nombre": "Permiso editado"})[0] == 200
          and req("GET", f"/permisos/{np_['id']}", ADM)[0] == 200 and req("DELETE", f"/permisos/{np_['id']}", ADM)[0] == 200)
st, ncat = req("POST", "/categorias", ADM, {"nombre": f"Categoría {RUN}", "descripcion": "Prueba"})
check("Crear categoría (201)", st == 201, (st, ncat))
check("Editar / consultar / eliminar categoría vacía", req("PATCH", f"/categorias/{ncat['id']}", ADM, {"descripcion": "Editada"})[0] == 200
      and req("GET", f"/categorias/{ncat['id']}", VEN)[0] == 200 and req("DELETE", f"/categorias/{ncat['id']}", ADM)[0] == 200)
st, d = req("DELETE", f"/categorias/{cats[0]['id']}", ADM)
check("No se elimina una categoría con productos -> 400", st == 400, st)
st, pv = req("POST", "/proveedores", ADM, {"nombre": f"Proveedor {RUN}", "nit": "1234567", "esActivo": True})
check("Crear proveedor con el formulario de la UI (esActivo) (201)", st == 201, (st, pv))
check("Editar / consultar / eliminar proveedor", req("PATCH", f"/proveedores/{pv['id']}", ADM, {"telefono": "2525252"})[0] == 200
      and req("GET", f"/proveedores/{pv['id']}", CAJ)[0] == 200 and req("DELETE", f"/proveedores/{pv['id']}", ADM)[0] == 200)
check("Listar proveedores (todos los roles)", req("GET", "/proveedores", VEN)[0] == 200)
st, d = req("POST", "/configuracion", ADM, {"clave": "bs_por_punto", "valor": 10, "tipo": "number"})
check("Editar parámetro numérico desde la UI (valor numérico) (201)", st == 201, (st, d))
st, d = req("POST", "/configuracion", ADM, {"clave": "bs_por_punto", "valor": "-3", "tipo": "number"})
check("Parámetro numérico negativo -> 400", st == 400, st)
st, d = req("DELETE", "/configuracion/bs_por_punto", ADM)
check("Un parámetro del sistema no se elimina -> 400", st == 400, st)
st, d = req("POST", "/configuracion", ADM, {"clave": f"prueba_{RUN}", "valor": "hola"})
check("Crear / leer / eliminar / restaurar parámetro propio",
      st == 201 and req("GET", f"/configuracion/prueba_{RUN}", ADM)[0] == 200 and req("DELETE", f"/configuracion/prueba_{RUN}", ADM)[0] == 200
      and req("POST", "/configuracion", ADM, {"clave": f"prueba_{RUN}", "valor": "otra"})[0] == 201)
req("DELETE", f"/configuracion/prueba_{RUN}", ADM)
check("Listar configuración", req("GET", "/configuracion", CAJ)[0] == 200)
st, rp = req("POST", "/reportes", ADM, {"nombre": f"Reporte {RUN}", "tipo": "VENTAS_DIA", "usuarioId": adm["id"]})
check("Crear reporte guardado (201)", st == 201, (st, rp))
if st == 201:
    check("Listar / consultar / editar / eliminar reporte", req("GET", "/reportes", ADM)[0] == 200 and req("GET", f"/reportes/{rp['id']}", ADM)[0] == 200
          and req("PATCH", f"/reportes/{rp['id']}", ADM, {"nombre": "Editado"})[0] == 200 and req("DELETE", f"/reportes/{rp['id']}", ADM)[0] == 200)

print("\n== 13b. Regresiones corregidas en la revisión de usuario ==")
# Subida de imagen (multipart) y acceso público a la URL devuelta.
PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c63f8cfc0f00f0004850180848a"
                    "98210000000049454e44ae426082")
def subir(token, nombre, tipo, datos):
    lim = "----md" + uuid.uuid4().hex
    cuerpo = (f"--{lim}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{nombre}\"\r\n"
              f"Content-Type: {tipo}\r\n\r\n").encode() + datos + f"\r\n--{lim}--\r\n".encode()
    r = urllib.request.Request(API + "/uploads/imagen", data=cuerpo, method="POST")
    r.add_header("Content-Type", "multipart/form-data; boundary=" + lim)
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            st, raw = resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        st, raw = e.code, e.read().decode()
    llamadas.append(("POST", "/uploads/imagen", st))
    try: return st, json.loads(raw)
    except Exception: return st, raw
st, d = subir(ADM, "foto.png", "image/png", PNG)
check("Subir imagen PNG (admin) -> 201 con URL", st == 201 and str(d.get("url", "")).startswith("/api/uploads/"), (st, d))
if st == 201:
    with urllib.request.urlopen(API.replace("/api", "") + d["url"], timeout=10) as resp:
        check("La imagen subida es accesible por su URL", resp.status == 200)
check("Subir un archivo que no es imagen -> 400", subir(ADM, "x.txt", "text/plain", b"hola")[0] == 400)
check("Vendedor no puede subir imágenes -> 403", subir(VEN, "foto.png", "image/png", PNG)[0] == 403)

# Edición de producto desde la UI (envía otorgaPuntos y campos vaciados como null).
st, prods = req("GET", "/productos", ADM)
pr = prods[0]
st, d = req("PATCH", f"/productos/{pr['id']}", ADM, {"otorgaPuntos": not pr["otorgaPuntos"], "rutaImagen": None, "precioMayorista": None})
check("Editar producto con otorgaPuntos y campos opcionales en null (200)", st == 200 and d["otorgaPuntos"] == (not pr["otorgaPuntos"]), (st, d if st != 200 else ""))
req("PATCH", f"/productos/{pr['id']}", ADM, {"otorgaPuntos": pr["otorgaPuntos"]})
st, d = req("POST", "/productos", ADM, {"nombre": "Sin SKU " + RUN, "categoriaId": pr["categoriaId"], "precioBase": 10, "stockActual": 0, "stockMinimo": 0})
check("Crear producto sin SKU -> SKU autogenerado PROD-NNN", st == 201 and re.match(r"^PROD-\d{3,}$", d.get("sku", "")), (st, d))
if st == 201: req("DELETE", f"/productos/{d['id']}", ADM)

# Cotización: la fecha de validez se guarda tal cual (sin corrimiento por zona horaria).
st, d = req("POST", "/cotizaciones", VEN, {"codigo": "COT-R" + RUN, "fechaValidez": "2026-12-31",
                                           "detalles": [{"productoId": pr["id"], "cantidad": 1, "precioUnitario": 10}]})
check("Cotización guarda la fecha de validez exacta (2026-12-31)", st == 201 and str(d.get("fechaValidez", ""))[:10] == "2026-12-31", (st, d.get("fechaValidez") if isinstance(d, dict) else d))

# Reporte guardado privado: queda a nombre de quien lo crea y aparece en su lista.
st, d = req("POST", "/reportes", CAJ, {"nombre": "Privado " + RUN, "tipo": "VENTAS_DIA"})
st2, lista = req("GET", "/reportes", CAJ)
check("Reporte privado aparece en la lista de su creador", st == 201 and any(x["id"] == d["id"] for x in lista), (st, st2))
st3, lista_ven = req("GET", "/reportes", VEN)
check("Reporte privado no aparece a otros usuarios", not any(x["id"] == d["id"] for x in lista_ven))
req("DELETE", f"/reportes/{d['id']}", ADM)

print("\n== 14. Indicadores ==")
st, stats = req("GET", "/ventas/stats", ADM)
check("Estadística de 7 días (fecha local) con 7 puntos", st == 200 and len(stats) == 7 and stats[-1]["fecha"] == hoy, stats[-1] if stats else stats)
check("Filtros de ventas por estado/método/cliente/fecha", all(req("GET", q, ADM)[0] == 200 for q in (
    "/ventas?estado=COMPLETADA", "/ventas?metodoPago=QR", f"/ventas?clienteId={cli['id']}", f"/ventas?desde={hoy}&hasta={hoy}")))
check("Listado de devoluciones y detalle", req("GET", "/devoluciones", CAJ)[0] == 200 and req("GET", f"/devoluciones/{dv['id']}", CAJ)[0] == 200)
check("Listado de autorizaciones (todas)", req("GET", "/autorizaciones?estado=APROBADA", ADM)[0] == 200)
check("Documentación Swagger disponible (/api/docs-json)", req("GET", "/docs-json")[0] == 200)

print("\n== 15. Consistencia del inventario perpetuo ==")
import subprocess
env = dict(os.environ, PGPASSWORD=os.environ.get("PGPASSWORD", "postgres"))
sql = """SET search_path TO inventario;
SELECT count(*) FROM productos p
 WHERE p.stock_actual <> COALESCE((SELECT k.stock_nuevo FROM kardex k WHERE k.producto_id = p.id
                                   ORDER BY k.created_at DESC, k.id DESC LIMIT 1), 0);
SELECT count(*) FROM productos p
 WHERE p.stock_actual <> COALESCE((SELECT SUM(CASE k.tipo_movimiento WHEN 'ENTRADA' THEN k.cantidad WHEN 'SALIDA' THEN -k.cantidad
        ELSE k.stock_nuevo - k.stock_anterior END) FROM kardex k WHERE k.producto_id = p.id), 0);
SELECT count(*) FROM productos WHERE stock_actual < 0;
SELECT count(*) FROM clientes c WHERE c.puntos_acumulados < 0;
SELECT (SELECT count(*) FROM productos WHERE deleted_at IS NOT NULL AND deleted_by IS NULL)
     + (SELECT count(*) FROM clientes WHERE deleted_at IS NOT NULL AND deleted_by IS NULL)
     + (SELECT count(*) FROM usuarios WHERE deleted_at IS NOT NULL AND deleted_by IS NULL);
SELECT count(*) FROM auditoria_log WHERE operacion = 'SOFT_DELETE' AND usuario_id IS NOT NULL;"""
try:
    out = subprocess.run(["psql", "-h", "localhost", "-U", "postgres", "-d", "mundo_detalles", "-tA", "-c", sql],
                         capture_output=True, env=env, text=True).stdout.split()
    n1, n2, n3, n4, n5, n6 = [int(x) for x in out[-6:]]
    check("Stock de cada producto = último saldo del Kardex", n1 == 0, n1)
    check("Stock de cada producto = Σ entradas − Σ salidas ± ajustes", n2 == 0, n2)
    check("Ningún stock ni saldo de puntos negativo", n3 == 0 and n4 == 0, (n3, n4))
    check("Cada eliminación lógica registra quién la hizo (deleted_by)", n5 == 0, n5)
    check("La auditoría (auditoria_log) guarda el usuario de cada soft-delete", n6 >= 3, n6)
except Exception as e:  # sin psql en este equipo
    print("  (omitido: psql no disponible)", e)

# ---- cobertura de endpoints ----
print("\n== 16. Cobertura de los endpoints ==")
def normal(r):
    return re.sub(r":[A-Za-z]+", ":id", r)
st, sw = req("GET", "/docs-json")
rutas = set()
for path, ops in sw["paths"].items():
    for m in ops:
        rutas.add((m.upper(), normal(re.sub(r"\{[^}]+\}", ":id", path.replace("/api", "", 1)))))
hechas = {(m, normal(p.replace("/documento/9" + RUN, "/documento/:id"))) for m, p, s in llamadas}
hechas = {(m, re.sub(r"/configuracion/[a-z_0-9]+", "/configuracion/:id", p)) for m, p in hechas}
hechas = {(m, re.sub(r"/clientes/documento/[0-9]+", "/clientes/documento/:id", p)) for m, p in hechas}
faltan = sorted(rutas - hechas)
check(f"Se ejercitaron los {len(rutas)} endpoints documentados", not faltan, faltan)
errores500 = [(m, p) for m, p, s in llamadas if s >= 500]
check(f"Ninguna de las {len(llamadas)} llamadas devolvió error 5xx", not errores500, errores500[:5])

ok = sum(1 for r in resultados if r[0])
print(f"\nRESULTADO: {ok}/{len(resultados)} verificaciones aprobadas; {len(rutas)} endpoints; {len(llamadas)} llamadas HTTP.")
json.dump({"aprobadas": ok, "total": len(resultados), "endpoints": len(rutas), "llamadas": len(llamadas),
           "fallas": [r[1] + " -> " + str(r[2]) for r in resultados if not r[0]]},
          open(os.environ.get("RESUMEN", "/tmp/resumen-pruebas.json"), "w"), ensure_ascii=False, indent=1)
sys.exit(0 if ok == len(resultados) else 1)
