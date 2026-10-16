-- ============================================================================
-- SEED — Datos iniciales para arrancar el sistema (idempotente)
-- ----------------------------------------------------------------------------
-- El schema.sql NO incluye datos, por lo que sin este seed no hay usuarios ni
-- roles y es imposible iniciar sesión. Este seed crea:
--   • 3 roles del negocio: Administrador, Cajero, Vendedor
--   • Permisos granulares (modulo.accion) y su asignación por rol (RBAC)
--   • 5 usuarios: 1 administrador, 2 cajeros, 2 vendedores
--
-- Credenciales (CAMBIAR EN PRODUCCIÓN):
--   admin@mundodetalles.com     / Admin123!
--   cajero1@mundodetalles.com   / Cajero123!
--   cajero2@mundodetalles.com   / Cajero123!
--   vendedor1@mundodetalles.com / Vendedor123!
--   vendedor2@mundodetalles.com / Vendedor123!
-- ============================================================================

SET search_path TO inventario, public;

-- ----------------------------------------------------------------------------
-- 1. ROLES
-- ----------------------------------------------------------------------------
INSERT INTO inventario.roles (nombre, descripcion, nivel_jerarquico, es_sistema) VALUES
  ('Administrador', 'Acceso total al sistema',                 100, TRUE),
  ('Cajero',        'Caja, ventas, devoluciones y clientes',    50, TRUE),
  ('Vendedor',      'Ventas, cotizaciones y consulta',          30, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. PERMISOS (CRUD por módulo + acciones especiales)
-- ----------------------------------------------------------------------------
-- El CHECK ck_permisos_codigo exige codigo ~ '^[A-Z_]+$' → formato MODULO_ACCION.
INSERT INTO inventario.permisos (codigo, nombre, modulo)
SELECT upper(m.modulo) || '_' || upper(a.accion),
       initcap(a.accion) || ' ' || m.modulo,
       m.modulo
FROM (VALUES
    ('usuarios'), ('roles'), ('permisos'), ('productos'), ('categorias'),
    ('proveedores'), ('clientes'), ('ventas'), ('devoluciones'), ('caja'),
    ('kardex'), ('cotizaciones'), ('fidelizacion'), ('reportes'),
    ('configuracion'), ('autorizaciones')
  ) AS m(modulo)
CROSS JOIN (VALUES ('crear'), ('leer'), ('actualizar'), ('eliminar')) AS a(accion)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO inventario.permisos (codigo, nombre, modulo) VALUES
  ('VENTAS_ANULAR',          'Anular ventas',          'ventas'),
  ('CAJA_ABRIR',             'Abrir caja',             'caja'),
  ('CAJA_CERRAR',            'Cerrar caja',            'caja'),
  ('AUTORIZACIONES_APROBAR', 'Aprobar autorizaciones', 'autorizaciones')
ON CONFLICT (codigo) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. ASIGNACIÓN DE PERMISOS A ROLES (matriz RBAC)
-- ----------------------------------------------------------------------------
-- 3.1 Administrador: TODOS los permisos
INSERT INTO inventario.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM inventario.roles r CROSS JOIN inventario.permisos p
WHERE r.nombre = 'Administrador'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 3.2 Cajero: leer todo + operar caja/ventas/devoluciones/clientes/cotizaciones
INSERT INTO inventario.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM inventario.roles r JOIN inventario.permisos p ON TRUE
WHERE r.nombre = 'Cajero' AND (
      p.codigo LIKE '%_LEER'
   OR p.codigo IN (
        'VENTAS_CREAR','VENTAS_ACTUALIZAR','VENTAS_ANULAR',
        'DEVOLUCIONES_CREAR','DEVOLUCIONES_ACTUALIZAR',
        'CLIENTES_CREAR','CLIENTES_ACTUALIZAR',
        'COTIZACIONES_CREAR','COTIZACIONES_ACTUALIZAR',
        'CAJA_CREAR','CAJA_ABRIR','CAJA_CERRAR'
      )
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 3.3 Vendedor: consulta + crear ventas/cotizaciones/clientes + solicitar autorización
INSERT INTO inventario.roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM inventario.roles r JOIN inventario.permisos p ON TRUE
WHERE r.nombre = 'Vendedor' AND (
      p.codigo IN (
        'PRODUCTOS_LEER','CATEGORIAS_LEER','CLIENTES_LEER','VENTAS_LEER',
        'COTIZACIONES_LEER','FIDELIZACION_LEER','KARDEX_LEER',
        'VENTAS_CREAR','COTIZACIONES_CREAR','CLIENTES_CREAR',
        'AUTORIZACIONES_CREAR','AUTORIZACIONES_LEER'
      )
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. USUARIOS (1 admin, 2 cajeros, 2 vendedores)
-- ----------------------------------------------------------------------------
INSERT INTO inventario.usuarios (email, username, password_hash, nombre, apellido, rol_id, es_activo)
SELECT v.email, v.username, v.password_hash, v.nombre, v.apellido, r.id, TRUE
FROM (VALUES
    ('admin@mundodetalles.com',     'admin',     '$2a$10$1AnfnkgAcqh4iGHJ.klEXOik4Tl3a7UdPKySoIP10GpAY0GfgC1xC', 'Admin',    'Sistema',   'Administrador'),
    ('cajero1@mundodetalles.com',   'cajero1',   '$2a$10$UYpfb7ZNskfAut2X4CtGL.Dg/Rh4/9EAkrLYe8BBGpIj2HJ4f3wfq', 'Carla',    'Cajera',    'Cajero'),
    ('cajero2@mundodetalles.com',   'cajero2',   '$2a$10$UYpfb7ZNskfAut2X4CtGL.Dg/Rh4/9EAkrLYe8BBGpIj2HJ4f3wfq', 'Diego',    'Cajero',    'Cajero'),
    ('vendedor1@mundodetalles.com', 'vendedor1', '$2a$10$XWnzAorAARPKp.FpK/dNOetxjyxWzmS087YtOqM3dYTl.e/8KIFYu', 'Lucia',    'Vendedora', 'Vendedor'),
    ('vendedor2@mundodetalles.com', 'vendedor2', '$2a$10$XWnzAorAARPKp.FpK/dNOetxjyxWzmS087YtOqM3dYTl.e/8KIFYu', 'Marco',    'Vendedor',  'Vendedor')
  ) AS v(email, username, password_hash, nombre, apellido, rol_nombre)
JOIN inventario.roles r ON r.nombre = v.rol_nombre
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. CONFIGURACIÓN POR DEFECTO (parámetros del negocio)
-- ----------------------------------------------------------------------------
INSERT INTO inventario.configuracion (clave, valor, tipo, descripcion, es_sistema) VALUES
  ('impuesto_porcentaje', '0',  'number', 'Impuesto adicional sobre la venta (%). 0: los precios ya incluyen el IVA (13 %); la facturación SIAT es trabajo futuro', TRUE),
  ('bs_por_punto',        '10', 'number', 'Bolivianos de consumo por cada punto de fidelización', TRUE),
  ('stock_minimo_alerta', '5',  'number', 'Umbral global de alerta de stock bajo', TRUE),
  ('puntos_nivel_plata',   '500',  'number', 'Puntos para alcanzar el nivel PLATA', TRUE),
  ('puntos_nivel_oro',     '1000', 'number', 'Puntos para alcanzar el nivel ORO', TRUE),
  ('puntos_nivel_platino', '1500', 'number', 'Puntos para alcanzar el nivel PLATINO', TRUE)
ON CONFLICT (clave) DO NOTHING;
