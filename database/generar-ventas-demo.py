#!/usr/bin/env python3
"""Genera ventas/historial de demostración vía la API (datos consistentes)."""
import json, os, urllib.request, urllib.error, subprocess, random

# Por defecto el backend local (puerto 3002). En Docker también se publica 3002.
API = os.environ.get("API", "http://localhost:3002/api")
random.seed(42)

def req(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def login(email, pw):
    _, d = req("POST", "/auth/login", body={"email": email, "password": pw})
    return d["access_token"], d["usuario"]["id"]

PSQL_OK = True
def psql(sql):
    """Ajusta fechas de demostración directamente en la BD (requiere psql)."""
    global PSQL_OK
    env = dict(os.environ, PGPASSWORD=os.environ.get("PGPASSWORD", "postgres"))
    try:
        r = subprocess.run(["psql", "-h", "localhost", "-U", "postgres", "-d", "mundo_detalles", "-c", sql],
                           capture_output=True, env=env)
        if r.returncode != 0 and PSQL_OK:
            PSQL_OK = False
            print("aviso: no se pudieron retroceder las fechas (psql):", r.stderr.decode()[:120])
    except FileNotFoundError:
        if PSQL_OK:
            PSQL_OK = False
            print("aviso: psql no está instalado; las ventas quedan con la fecha de hoy.")

# --- usuarios ---
users = {
    "admin":     login("admin@mundodetalles.com", "Admin123!"),
    "cajero1":   login("cajero1@mundodetalles.com", "Cajero123!"),
    "cajero2":   login("cajero2@mundodetalles.com", "Cajero123!"),
    "vendedor1": login("vendedor1@mundodetalles.com", "Vendedor123!"),
    "vendedor2": login("vendedor2@mundodetalles.com", "Vendedor123!"),
}
admin_tok = users["admin"][0]

# --- caja abierta (por cajero1) ---
req("POST", "/caja/abrir", users["cajero1"][0], {"montoInicial": 500})

# --- catálogo y clientes ---
_, productos = req("GET", "/productos", admin_tok)
_, clientes = req("GET", "/clientes", admin_tok)
prod = [p for p in productos if p.get("esActivo", True)]
stock = {p["id"]: p["stockActual"] for p in prod}   # stock local para no intentar sobrevender
cli_ids = [c["id"] for c in clientes]

pagos = ["EFECTIVO", "QR", "TARJETA", "TRANSFERENCIA"]
vendedores = ["cajero1", "cajero2", "vendedor1", "vendedor2", "admin"]

correlativo = 1
ventas_creadas = []

# ~26 ventas repartidas en los últimos 12 días
plan = []
for dia in range(12, -1, -1):          # de hace 12 días a hoy
    n = random.choice([1, 2, 2, 3])    # ventas por día
    for _ in range(n):
        plan.append(dia)

for dias_atras in plan:
    vend = random.choice(vendedores)
    tok, uid = users[vend]
    # 1-3 productos por venta, solo con stock disponible
    con_stock = [p for p in prod if stock[p["id"]] > 0]
    if not con_stock:
        break
    items = random.sample(con_stock, min(len(con_stock), random.randint(1, 3)))
    detalles = []
    subtotal = 0
    for it in items:
        cant = random.randint(1, min(3, stock[it["id"]]))
        precio = float(it["precioBase"])
        detalles.append({"productoId": it["id"], "cantidad": cant, "precioUnitario": precio})
        subtotal += cant * precio
    # 65% con cliente
    cliente = random.choice(cli_ids) if random.random() < 0.65 else None
    codigo = f"NV-{correlativo:06d}"
    correlativo += 1
    body = {
        "codigoComprobante": codigo,
        "usuarioId": uid,
        "metodoPago": random.choice(pagos),
        "subtotal": subtotal, "total": subtotal,
        "detalles": detalles,
    }
    if cliente:
        body["clienteId"] = cliente
    st, d = req("POST", "/ventas", tok, body)
    if st in (200, 201) and d.get("id"):
        for det in detalles:
            stock[det["productoId"]] -= det["cantidad"]
        ventas_creadas.append((d["id"], dias_atras))
        # fijar la fecha de la venta y de su kardex/fidelización N días atrás
        psql(f"UPDATE inventario.ventas SET created_at = NOW() - INTERVAL '{dias_atras} days' WHERE id='{d['id']}';")
        psql(f"UPDATE inventario.kardex SET created_at = NOW() - INTERVAL '{dias_atras} days' WHERE referencia_id='{d['id']}';")
        psql(f"UPDATE inventario.fidelizacion_historial SET created_at = NOW() - INTERVAL '{dias_atras} days' WHERE venta_id='{d['id']}';")
    else:
        print("venta fallo:", st, str(d)[:100])

print(f"ventas creadas: {len(ventas_creadas)}")

# --- 1 venta con precio negociado: el vendedor solicita, el administrador aprueba ---
tok_v, _ = users["vendedor1"]
cands = [p for p in prod if stock[p["id"]] >= 2 and float(p["precioBase"]) >= 100]
if cands:
    it = cands[0]
    sub_total = 2 * float(it["precioBase"])
    st, d = req("POST", "/ventas", tok_v, {
        "codigoComprobante": f"NV-{correlativo:06d}",
        "metodoPago": "EFECTIVO",
        "clienteId": cli_ids[0],
        "detalles": [{"productoId": it["id"], "cantidad": 2}],
        "precioSolicitado": round(sub_total * 0.9, 2),
        "motivoDescuento": "Cliente frecuente, compra de dos unidades",
    })
    if st in (200, 201) and d.get("estado") == "PENDIENTE":
        st2, _ = req("POST", "/autorizaciones/responder", admin_tok, {
            "autorizacionId": d["autorizacionId"], "estado": "APROBADA",
            "motivoRespuesta": "Aprobado por volumen"})
        stock[it["id"]] -= 2
        print("venta con descuento autorizado:", st2)
    else:
        print("venta con descuento fallo:", st, str(d)[:120])

# --- 1 anulación ---
if ventas_creadas:
    vid = ventas_creadas[3][0]
    st, _ = req("PATCH", f"/ventas/{vid}/anular", users["admin"][0], {"motivo": "Cliente desistió de la compra"})
    print("anulacion:", st)

# --- 2 devoluciones ---
dev_n = 0
for vid, _ in ventas_creadas[5:9]:
    _, venta = req("GET", f"/ventas/{vid}", admin_tok)
    if venta.get("estado") != "COMPLETADA" or not venta.get("detalles"):
        continue
    det = venta["detalles"][0]
    body = {"ventaId": vid, "codigo": f"DEV-{random.randint(1000,9999)}",
            "motivo": "Producto con defecto de fábrica",
            "detalles": [{"productoId": det["productoId"], "cantidad": 1,
                          "precioUnitario": float(det["precioUnitario"])}]}
    st, _ = req("POST", "/devoluciones", users["cajero1"][0], body)
    if st in (200, 201):
        dev_n += 1
    if dev_n >= 2:
        break
print("devoluciones:", dev_n)

# --- canjes de premios (clientes con puntos suficientes) ---
_, premios = req("GET", "/premios?disponibles=true", admin_tok)
_, clientes = req("GET", "/clientes", admin_tok)
canjes = 0
for c in clientes:
    pts = c.get("puntosAcumulados", 0)
    opciones = [p for p in premios if p["puntosRequeridos"] <= pts]
    if opciones:
        pr = min(opciones, key=lambda x: x["puntosRequeridos"])
        st, _ = req("POST", f"/premios/{pr['id']}/canjear", users["cajero1"][0],
                    {"clienteId": c["id"]})
        if st in (200, 201):
            canjes += 1
    if canjes >= 3:
        break
print("canjes:", canjes)
