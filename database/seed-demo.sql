-- ============================================================================
-- SEMILLA DE DEMOSTRACIÓN (datos robustos y realistas) — Mundo Detalles
-- ----------------------------------------------------------------------------
-- Catálogo real del negocio (regalos y trajes), proveedores, clientes con
-- niveles de fidelización y premios canjeables. Los precios están en Bolivianos.
-- Cargar DESPUÉS de schema.sql y seed.sql. Las VENTAS se generan por API
-- (script generar-ventas) para mantener stock, Kardex y puntos consistentes.
-- ============================================================================

SET search_path TO inventario, public;

-- ----------------------------------------------------------------------------
-- 1. CATEGORÍAS
-- ----------------------------------------------------------------------------
INSERT INTO inventario.categorias (nombre, descripcion) VALUES
  ('Flores',    'Ramos y arreglos florales'),
  ('Peluches',  'Osos y peluches de regalo'),
  ('Cuadros',   'Cuadros y arte personalizado'),
  ('Tazas',     'Tazas y mugs personalizables'),
  ('Carteras',  'Carteras y bolsos'),
  ('Mochilas',  'Mochilas urbanas y escolares'),
  ('Trajes',    'Trajes formales de 2 y 3 piezas')
ON CONFLICT (nombre) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. PROVEEDORES
-- ----------------------------------------------------------------------------
INSERT INTO inventario.proveedores (nombre, contacto, telefono, email, nit) VALUES
  ('Distribuidora Floral Oruro',  'María Villca',   '71234567', 'ventas@floraloruro.bo',   '1023456017'),
  ('Importadora El Detalle',      'Juan Mamani',    '72345678', 'contacto@eldetalle.bo',   '1034567018'),
  ('Textiles Almanza',            'Rosa Almanza',   '73456789', 'pedidos@textilalmanza.bo','1045678019'),
  ('Regalos Express Bolivia',     'Pedro Choque',   '74567890', 'info@regalosexpress.bo',  '1056789020')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. PRODUCTOS  (otorga_puntos: TRUE en artículos que el dueño premia)
-- ----------------------------------------------------------------------------
INSERT INTO inventario.productos
  (sku, nombre, categoria_id, precio_base, costo_promedio, stock_actual, stock_minimo, stock_maximo, otorga_puntos, atributos_dinamicos)
SELECT p.sku, p.nombre, c.id, p.precio, p.costo, p.stock, p.smin, p.smax, p.puntos, p.attrs::jsonb
FROM (VALUES
  -- Flores
  ('FLOR-001','Ramo de rosas rojas (12)', 'Flores',   120.00,  70.00, 25,  5, 60, TRUE,  '{}'),
  ('FLOR-002','Ramo mixto primaveral',    'Flores',   100.00,  55.00, 18,  5, 50, TRUE,  '{}'),
  ('FLOR-003','Girasoles (6)',            'Flores',    80.00,  40.00,  4,  5, 40, TRUE,  '{}'),
  ('FLOR-004','Caja de rosas eternas',    'Flores',   180.00, 100.00, 12,  3, 30, TRUE,  '{}'),
  -- Peluches
  ('PELU-001','Oso de peluche grande',    'Peluches', 150.00,  85.00, 15,  4, 40, TRUE,  '{"color":"café","tamano":"grande"}'),
  ('PELU-002','Oso de peluche mediano',   'Peluches',  80.00,  45.00, 22,  5, 50, FALSE, '{"color":"beige","tamano":"mediano"}'),
  ('PELU-003','Conejo de peluche',        'Peluches',  60.00,  32.00, 30,  6, 60, FALSE, '{"color":"blanco"}'),
  -- Cuadros
  ('CUAD-001','Cuadro personalizado A3',  'Cuadros',  200.00, 110.00, 10,  2, 25, TRUE,  '{}'),
  ('CUAD-002','Cuadro paisaje decorativo','Cuadros',  120.00,  65.00,  8,  3, 20, TRUE,  '{}'),
  ('CUAD-003','Cuadro con foto y marco',  'Cuadros',  150.00,  80.00,  3,  3, 20, TRUE,  '{}'),
  -- Tazas
  ('TAZA-001','Taza personalizada',       'Tazas',     35.00,  15.00, 40,  8, 80, FALSE, '{}'),
  ('TAZA-002','Taza mágica (cambia color)','Tazas',    45.00,  22.00, 28,  6, 60, FALSE, '{}'),
  ('TAZA-003','Set de 2 tazas pareja',    'Tazas',     70.00,  35.00, 16,  4, 40, TRUE,  '{}'),
  -- Carteras
  ('CART-001','Cartera de cuero dama',    'Carteras', 250.00, 140.00, 12,  3, 25, TRUE,  '{"color":"negro","material":"cuero"}'),
  ('CART-002','Cartera casual',           'Carteras', 150.00,  80.00, 14,  4, 30, TRUE,  '{"color":"café"}'),
  ('CART-003','Billetera de cuero',       'Carteras',  90.00,  48.00, 20,  5, 40, FALSE, '{"color":"negro"}'),
  -- Mochilas
  ('MOCH-001','Mochila urbana antirrobo', 'Mochilas', 180.00,  95.00, 10,  3, 25, TRUE,  '{"color":"gris"}'),
  ('MOCH-002','Mochila escolar',          'Mochilas', 120.00,  62.00, 18,  5, 40, FALSE, '{"color":"azul"}'),
  ('MOCH-003','Mochila deportiva',        'Mochilas', 140.00,  75.00,  9,  4, 30, FALSE, '{"color":"negro"}'),
  -- Trajes (2/3 piezas, tallas y colores en atributos dinámicos)
  ('TRAJ-001','Traje 2 piezas negro',     'Trajes',   800.00, 480.00,  6,  2, 15, TRUE,  '{"piezas":2,"talla":"M","color":"negro"}'),
  ('TRAJ-002','Traje 3 piezas azul',      'Trajes',  1100.00, 660.00,  4,  2, 12, TRUE,  '{"piezas":3,"talla":"L","color":"azul"}'),
  ('TRAJ-003','Traje 2 piezas gris',      'Trajes',   850.00, 510.00,  5,  2, 15, TRUE,  '{"piezas":2,"talla":"M","color":"gris"}'),
  ('TRAJ-004','Traje 3 piezas negro slim','Trajes',  1200.00, 720.00,  2,  2, 10, TRUE,  '{"piezas":3,"talla":"S","color":"negro"}')
) AS p(sku, nombre, cat, precio, costo, stock, smin, smax, puntos, attrs)
JOIN inventario.categorias c ON c.nombre = p.cat
ON CONFLICT (sku) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. CLIENTES  (niveles de fidelización acordes a sus puntos)
--    Umbrales usados por el sistema: PLATA 500, ORO 1000, PLATINO 1500 pts.
-- ----------------------------------------------------------------------------
INSERT INTO inventario.clientes
  (tipo_documento, numero_documento, nombre, apellido, email, telefono, puntos_acumulados, nivel_fidelizacion)
VALUES
  ('CI',  '4567890',  'Ana',      'Pérez Rojas',    'ana.perez@gmail.com',    '68011223', 120, 'BRONCE'),
  ('CI',  '5678901',  'Luis',     'Quispe Mamani',  'luis.quispe@gmail.com',  '68022334', 640, 'PLATA'),
  ('CI',  '6789012',  'Carla',    'Torrez Vaca',    'carla.torrez@gmail.com', '68033445', 1120,'ORO'),
  ('NIT', '1023456789','Empresa', 'Delicias SRL',   'compras@delicias.bo',    '68044556', 1580,'PLATINO'),
  ('CI',  '7890123',  'Marco',    'Flores Nina',    'marco.flores@gmail.com', '68055667', 45,  'BRONCE'),
  ('CI',  '8901234',  'Sofía',    'Vargas León',    'sofia.vargas@gmail.com', '68066778', 310, 'BRONCE'),
  ('CI',  '9012345',  'Diego',    'Condori Apaza',  'diego.condori@gmail.com','68077889', 780, 'PLATA'),
  ('CI',  '1123456',  'Valeria',  'Choque Mendoza', 'valeria.ch@gmail.com',   '68088990', 25,  'BRONCE'),
  ('CI',  '2234567',  'Jorge',    'Rocha Sánchez',  'jorge.rocha@gmail.com',  '68099001', 0,   'BRONCE'),
  ('CI',  '3345678',  'Elena',    'Mamani Cruz',    'elena.mamani@gmail.com', '68010112', 490, 'BRONCE')
ON CONFLICT (numero_documento) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. PREMIOS canjeables (con stock limitado)
-- ----------------------------------------------------------------------------
INSERT INTO inventario.premios (nombre, descripcion, puntos_requeridos, stock) VALUES
  ('Taza personalizada de regalo', 'Canjea tus puntos por una taza personalizada',        100, 25),
  ('Peluche pequeño sorpresa',     'Un tierno peluche pequeño por tu fidelidad',          250, 15),
  ('Cuadro mini con foto',         'Cuadro pequeño personalizado con tu foto favorita',   300,  8),
  ('Ramo de flores de cortesía',   'Un ramo primaveral de regalo',                        400, 10),
  ('Descuento VIP 15%',            'Cupón de 15% de descuento en tu próxima compra',      500, 40)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. KARDEX: inventario inicial
-- ----------------------------------------------------------------------------
-- Inventario perpetuo: el stock con el que arranca cada producto queda
-- registrado como ENTRADA, de modo que stock = entradas − salidas desde el inicio.
-- Se fecha 30 días atrás para que preceda a las ventas de demostración.
INSERT INTO inventario.kardex
  (producto_id, tipo_movimiento, cantidad, costo_unitario, stock_anterior, stock_nuevo,
   referencia, observacion, usuario_id, created_at, updated_at)
SELECT p.id, 'ENTRADA', p.stock_actual, p.costo_promedio, 0, p.stock_actual,
       'INVENTARIO_INICIAL', 'Stock inicial del catálogo',
       (SELECT id FROM inventario.usuarios WHERE email = 'admin@mundodetalles.com'),
       NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
FROM inventario.productos p
WHERE p.stock_actual > 0
  AND NOT EXISTS (SELECT 1 FROM inventario.kardex k
                  WHERE k.producto_id = p.id AND k.referencia = 'INVENTARIO_INICIAL');
