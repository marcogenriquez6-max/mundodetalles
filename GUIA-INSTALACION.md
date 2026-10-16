# Mundo Detalles — Guía de Instalación y Ejecución

Sistema web de gestión de inventarios, ventas y fidelización para la tienda de
regalos **Mundo Detalles** (Oruro, Bolivia).

Esta guía explica, paso a paso, cómo instalar el sistema, levantar el servicio y
cargar la base de datos con datos de demostración. Hay **dos caminos**:

- **A) Docker Compose** — recomendado para la entrega/defensa. Un solo comando,
  carga la base de datos y los datos automáticamente.
- **B) Instalación local** — recomendado para desarrollo (recarga en caliente).

---

## 1. Arquitectura y stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 · Vite 6 · React Router 7 · Tailwind CSS · Recharts · Socket.IO client |
| Backend | NestJS 11 · TypeORM 0.3 · JWT/Passport · Swagger · Socket.IO |
| Base de datos | PostgreSQL 16 (esquema `inventario`, `synchronize: false`) |
| Infraestructura | Docker Compose (db + backend + frontend/nginx) |

La base de datos **no se autogenera** desde el código (`synchronize: false`): el
esquema se crea con los scripts SQL de la carpeta `database/`.

---

## 2. Requisitos previos

### Para el camino A (Docker) — el más simple
- **Docker Desktop** (incluye Docker Compose). Nada más.

### Para el camino B (local)
- **Node.js 20 o superior** (probado con Node 24) y **npm 10+**.
- **PostgreSQL 16** instalado y en ejecución en el puerto `5432`.
- **Python 3** (solo si se quieren generar ventas de demostración).

> Nota importante: el paquete **no incluye las carpetas `node_modules`** (pesan
> cientos de MB y dependen del sistema operativo). Se instalan con `npm install`,
> como se indica abajo. Con Docker no hace falta instalarlas: se compilan dentro
> de los contenedores.

---

## 3. Camino A — Docker Compose (recomendado para la entrega)

Desde la carpeta del proyecto (`mundo-detalles/`, donde está `docker-compose.yml`):

```bash
docker compose up --build -d
```

Esto levanta tres contenedores y, la **primera vez**, la base de datos ejecuta
automáticamente y en orden:

1. `database/schema.sql` — crea el esquema `inventario` (24 tablas y 2 vistas).
2. `database/seed.sql` — roles, permisos (RBAC), 5 usuarios y configuración.
3. `database/seed-demo.sql` — catálogo real: 7 categorías, 23 productos,
   4 proveedores, 10 clientes, 5 premios y el inventario inicial en el Kardex.

Cuando termine, las URLs son:

| Servicio | URL |
|----------|-----|
| Aplicación (frontend) | http://localhost/ |
| API (backend) | http://localhost/api |
| Documentación de la API (Swagger) | http://localhost/api/docs |
| Tiempo real (WebSocket) | http://localhost/socket.io/ (lo usa la app; no se abre a mano) |

> En Docker el frontend se sirve con **nginx en el puerto 80** y este redirige
> `/api` al backend.

### 3.1 (Opcional) Generar ventas de demostración

El catálogo se carga solo, pero las **ventas** se generan por la API para que el
stock, el Kardex y los puntos queden consistentes. Con los contenedores arriba:

```bash
python3 database/generar-ventas-demo.py
```

Genera 21 ventas de los últimos 13 días (distintos métodos de pago y clientes,
una venta con descuento autorizado, una anulación, dos devoluciones y tres canjes
de premios). *Requiere Python 3 y que el backend responda en
`http://localhost:3002/api` (Docker ya publica ese puerto). Para fechar las ventas
en días anteriores usa `psql`; si no está instalado, las ventas quedan con la
fecha de hoy y el script lo avisa.*

### 3.2 Detener / reiniciar

```bash
docker compose down           # detener (conserva los datos)
docker compose down -v        # detener y BORRAR la base de datos (arranque limpio)
docker compose up --build -d  # volver a levantar
```

---

## 4. Camino B — Instalación local (recomendado para desarrollo)

### 4.1 Base de datos

Con PostgreSQL en ejecución en `localhost:5432` (usuario `postgres`):

```bash
# Desde la carpeta mundo-detalles/
createdb -h localhost -U postgres mundo_detalles           # crear la base
psql -h localhost -U postgres -d mundo_detalles -f database/schema.sql      # esquema
psql -h localhost -U postgres -d mundo_detalles -f database/seed.sql        # roles + usuarios
psql -h localhost -U postgres -d mundo_detalles -f database/seed-demo.sql   # catálogo demo
```

> Si `createdb` no está disponible, use:
> `psql -h localhost -U postgres -c "CREATE DATABASE mundo_detalles;"`

### 4.2 Backend (puerto 3002)

```bash
cd backend
cp .env.example .env      # el .env ya viene listo para localhost:5432
npm install
npm run start:dev         # modo desarrollo con recarga (o start:prod)
```

API disponible en `http://localhost:3002/api` · Swagger en `http://localhost:3002/api/docs`.

### 4.3 Frontend (puerto 5175)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Aplicación en `http://localhost:5175/` (Vite redirige `/api` al backend en 3002).

### 4.4 (Opcional) Ventas de demostración

Con backend y frontend arriba:

```bash
python3 database/generar-ventas-demo.py
```

### 4.5 Detener los servicios

```bash
lsof -ti:3002 | xargs kill     # backend
lsof -ti:5175 | xargs kill     # frontend
```

---

## 5. Credenciales de acceso

Sembradas por `seed.sql`. **Cambiar en producción.**

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador | `admin@mundodetalles.com` | `Admin123!` |
| Cajero | `cajero1@mundodetalles.com` | `Cajero123!` |
| Cajero | `cajero2@mundodetalles.com` | `Cajero123!` |
| Vendedor | `vendedor1@mundodetalles.com` | `Vendedor123!` |
| Vendedor | `vendedor2@mundodetalles.com` | `Vendedor123!` |

Cada rol ve un menú distinto (control de acceso por roles, RBAC): el administrador
tiene acceso total; el cajero opera caja, ventas, devoluciones y clientes; el
vendedor registra ventas y cotizaciones y solicita autorizaciones.

---

## 6. Verificación rápida

1. Abrir la aplicación e iniciar sesión como **administrador**.
2. En **Productos** deben verse 23 artículos (flores, peluches, cuadros, tazas,
   carteras, mochilas y trajes).
3. En **Ventas → Nueva venta**, agregar productos al carrito y registrar una
   venta: el **stock disminuye** y se genera un movimiento en **Kardex**.
4. En **Clientes** hay 10 clientes con niveles de fidelización.
5. En **Premios** hay 5 premios canjeables con stock.
6. **Autorización de descuentos en tiempo real:** abra dos navegadores (uno como
   administrador y otro como `vendedor1`). En **Ventas → Nueva venta**, el vendedor
   marca *Precio negociado*, indica el precio y el motivo y pulsa *Solicitar
   autorización*. Al administrador le aparece el aviso al instante (campana y
   notificación); al aprobar, modificar o rechazar, la venta del vendedor se completa.

---

## 6.1 Pruebas automatizadas

```bash
cd backend && npm test                 # 18 pruebas unitarias de la lógica de negocio
python3 pruebas/pruebas_api.py         # 173 verificaciones de integración (backend arriba)
```

Las pruebas de integración crean datos de prueba; para la demostración conviene
volver a cargar la base (`docker compose down -v` y levantar de nuevo).

Comprobación por consola (opcional):

```bash
psql -h localhost -U postgres -d mundo_detalles \
  -c "SET search_path TO inventario; SELECT count(*) FROM productos;"
```

---

## 7. Contenido del paquete

```
mundo-detalles/
├── backend/            Código NestJS (sin node_modules — se instalan con npm)
├── frontend/           Código React + Vite (sin node_modules)
├── database/
│   ├── schema.sql              Esquema completo (24 tablas, 2 vistas)
│   ├── seed.sql                Roles, permisos, usuarios, configuración
│   ├── seed-demo.sql           Catálogo, proveedores, clientes y premios
│   └── generar-ventas-demo.py  Genera ventas/devoluciones de demostración
├── pruebas/
│   └── pruebas_api.py          173 verificaciones de integración (84 endpoints)
├── nginx/              Configuración del proxy para Docker (/api y /socket.io)
├── docker-compose.yml  Orquestación de los tres servicios
└── GUIA-INSTALACION.md Este documento
```

---

## 8. Problemas frecuentes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| El login falla o no hay usuarios | No se cargó `seed.sql` | Ejecutar `seed.sql` (paso 4.1) |
| El catálogo está vacío | No se cargó `seed-demo.sql` | Ejecutar `seed-demo.sql` |
| Error de binarios al iniciar el frontend | `node_modules` de otro sistema operativo | Borrar `frontend/node_modules` y repetir `npm install` |
| El backend no conecta a la base | PostgreSQL apagado o `.env` incorrecto | Verificar Postgres en `:5432` y el archivo `backend/.env` |
| El puerto 5432 está ocupado (Docker) | Ya hay un Postgres local usando 5432 | Detener el Postgres local o cambiar el mapeo del puerto en `docker-compose.yml` |
| Quiero empezar de cero | La base tiene datos viejos | Docker: `docker compose down -v`. Local: `dropdb mundo_detalles` y repetir el paso 4.1 |

---

*Mundo Detalles — Prototipo tecnológico. La documentación completa del proyecto
(análisis, diseño, metodología Scrum y capturas) se encuentra en el documento
adjunto `DOCUMENTO-Mundo-Detalles-APA7.docx`.*
