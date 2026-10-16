-- ============================================================================
-- SISTEMA WEB DE GESTIÓN DE INVENTARIOS, CONTROL DE VENTAS Y FIDELIZACIÓN
-- Esquema de Base de Datos Relacional - PostgreSQL 16
-- Arquitectura: Full Stack (React 19 + NestJS 11)
-- ============================================================================
-- Cumplimiento ACID, Soft Delete, RBAC, Trazabilidad Financiera
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ESQUEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS inventario;
SET search_path TO inventario, public;

-- ============================================================================
-- 3. TABLAS DEL SISTEMA (RBAC)
-- ============================================================================

-- 3.1 Roles
CREATE TABLE inventario.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(255),
    nivel_jerarquico SMALLINT NOT NULL DEFAULT 0,
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID, -- FK a usuarios se añade por ALTER al final (usuarios se crea después)
    CONSTRAINT ck_roles_nivel CHECK (nivel_jerarquico >= 0)
);

-- 3.2 Permisos
CREATE TABLE inventario.permisos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    modulo VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_permisos_codigo CHECK (codigo ~ '^[A-Z_]+$')
);

-- 3.3 Relación Roles - Permisos (N:M)
CREATE TABLE inventario.roles_permisos (
    rol_id UUID NOT NULL REFERENCES inventario.roles(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES inventario.permisos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

-- 3.4 Usuarios
CREATE TABLE inventario.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(180) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    rol_id UUID NOT NULL REFERENCES inventario.roles(id),
    refresh_token TEXT,
    es_activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_usuarios_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- 4. TABLAS DE NEGOCIO
-- ============================================================================

-- 4.1 Categorías
CREATE TABLE inventario.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    ruta_imagen TEXT,
    padre_id UUID REFERENCES inventario.categorias(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id)
);

-- 4.2 Productos
CREATE TABLE inventario.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_barras VARCHAR(50) UNIQUE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id UUID NOT NULL REFERENCES inventario.categorias(id),
    precio_base DECIMAL(12,2) NOT NULL,
    precio_mayorista DECIMAL(12,2),
    costo_promedio DECIMAL(12,2),
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 0,
    stock_maximo INTEGER NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'unidad',
    atributos_dinamicos JSONB NOT NULL DEFAULT '{}',
    ruta_imagen TEXT,
    es_activo BOOLEAN NOT NULL DEFAULT TRUE,
    otorga_puntos BOOLEAN NOT NULL DEFAULT FALSE, -- si el producto genera puntos de fidelización
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_productos_stock CHECK (stock_actual >= 0),
    CONSTRAINT ck_productos_precio CHECK (precio_base > 0),
    CONSTRAINT ck_productos_precio_mayorista CHECK (precio_mayorista IS NULL OR precio_mayorista > 0)
);

-- 4.3 Clientes
CREATE TABLE inventario.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento VARCHAR(20) NOT NULL DEFAULT 'CI', -- Bolivia: C.I. o NIT
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(180),
    telefono VARCHAR(20),
    direccion TEXT,
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    puntos_acumulados INTEGER NOT NULL DEFAULT 0,
    nivel_fidelizacion VARCHAR(20) NOT NULL DEFAULT 'BRONCE'
        CHECK (nivel_fidelizacion IN ('BRONCE', 'PLATA', 'ORO', 'PLATINO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_clientes_puntos CHECK (puntos_acumulados >= 0)
);

-- ============================================================================
-- 5. VENTAS Y TRANSACCIONES
-- ============================================================================

-- 5.1 Ventas
CREATE TABLE inventario.ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_comprobante VARCHAR(20) UNIQUE NOT NULL,
    -- Bolivia: nota de venta (sin derecho a crédito fiscal); la FACTURA y la
    -- NOTA_CREDITO_DEBITO quedan reservadas para la facturación del SIN (SIAT).
    tipo_comprobante VARCHAR(20) NOT NULL DEFAULT 'NOTA_VENTA'
        CHECK (tipo_comprobante IN ('NOTA_VENTA', 'FACTURA', 'NOTA_CREDITO_DEBITO')),
    cliente_id UUID REFERENCES inventario.clientes(id),
    usuario_id UUID NOT NULL REFERENCES inventario.usuarios(id),
    autorizacion_id UUID, -- FK se agrega después
    subtotal DECIMAL(12,2) NOT NULL,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    impuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    puntos_generados INTEGER NOT NULL DEFAULT 0,
    puntos_redimidos INTEGER NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO'
        CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR')),
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA'
        CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'ANULADA', 'REEMBOLSADA')),
    motivo_anulacion TEXT,
    tiene_devolucion BOOLEAN NOT NULL DEFAULT FALSE, -- "sello" de venta con devolución (RF-11)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_ventas_montos CHECK (
        subtotal >= 0 AND descuento >= 0 AND impuesto >= 0 AND total >= 0
    )
);

-- 5.2 Detalle de Venta
CREATE TABLE inventario.detalle_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES inventario.ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES inventario.productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    precio_autorizado DECIMAL(12,2), -- precio aprobado por autorización async
    descuento_aplicado DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    requiere_autorizacion BOOLEAN NOT NULL DEFAULT FALSE,
    autorizacion_id UUID, -- FK se agrega después
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_precio CHECK (precio_unitario >= 0),
    CONSTRAINT ck_detalle_subtotal CHECK (subtotal >= 0)
);

-- ============================================================================
-- 6. AUTORIZACIONES ASÍNCRONAS (WebSockets)
-- ============================================================================
CREATE TABLE inventario.autorizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detalle_venta_id UUID REFERENCES inventario.detalle_venta(id),
    venta_id UUID NOT NULL REFERENCES inventario.ventas(id),
    solicitante_id UUID NOT NULL REFERENCES inventario.usuarios(id),
    aprobador_id UUID REFERENCES inventario.usuarios(id),
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN ('DESCUENTO_ESPECIAL', 'PRECIO_ESPECIAL', 'CREDITO', 'ANULACION')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'EXPIRADA')),
    precio_solicitado DECIMAL(12,2),
    precio_aprobado DECIMAL(12,2),
    motivo_solicitud TEXT NOT NULL,
    motivo_respuesta TEXT,
    session_id VARCHAR(100), -- ID de sesión WebSocket para notificación en tiempo real
    expira_en TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    respondida_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agregar FKs circulares
ALTER TABLE inventario.ventas
    ADD CONSTRAINT fk_ventas_autorizacion
    FOREIGN KEY (autorizacion_id) REFERENCES inventario.autorizaciones(id);

ALTER TABLE inventario.detalle_venta
    ADD CONSTRAINT fk_detalle_autorizacion
    FOREIGN KEY (autorizacion_id) REFERENCES inventario.autorizaciones(id);

-- ============================================================================
-- 7. FIDELIZACIÓN Y PUNTOS
-- ============================================================================
CREATE TABLE inventario.fidelizacion_historial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES inventario.clientes(id),
    venta_id UUID REFERENCES inventario.ventas(id),
    tipo_operacion VARCHAR(20) NOT NULL
        CHECK (tipo_operacion IN ('ACUMULACION', 'REDENCION', 'CADUCIDAD', 'AJUSTE')),
    puntos INTEGER NOT NULL,
    saldo_anterior INTEGER NOT NULL,
    saldo_posterior INTEGER NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES inventario.usuarios(id)
);

-- 7.1 Catálogo de premios (canjeables por puntos, con stock limitado)
CREATE TABLE inventario.premios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    puntos_requeridos INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    es_activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_premios_puntos CHECK (puntos_requeridos > 0),
    CONSTRAINT ck_premios_stock CHECK (stock >= 0)
);

-- 7.2 Canjes de premios (redención de puntos por un premio)
CREATE TABLE inventario.canjes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES inventario.clientes(id),
    premio_id UUID NOT NULL REFERENCES inventario.premios(id),
    puntos_usados INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES inventario.usuarios(id)
);

-- ============================================================================
-- 8. AUDITORÍA Y TRAZABILIDAD
-- ============================================================================

-- 8.1 Historial de Precios
CREATE TABLE inventario.precios_historial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES inventario.productos(id),
    precio_anterior DECIMAL(12,2) NOT NULL,
    precio_nuevo DECIMAL(12,2) NOT NULL,
    tipo_precio VARCHAR(30) NOT NULL DEFAULT 'BASE'
        CHECK (tipo_precio IN ('BASE', 'MAYORISTA', 'ESPECIAL')),
    motivo VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES inventario.usuarios(id)
);

-- 8.2 Log de Auditoría (Soft Delete y Cambios Críticos)
CREATE TABLE inventario.auditoria_log (
    id BIGSERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id UUID,
    operacion VARCHAR(20) NOT NULL
        CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id UUID REFERENCES inventario.usuarios(id),
    direccion_ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. TABLAS DE NEGOCIO ADICIONALES
-- ============================================================================

-- 9.1 Proveedores
CREATE TABLE inventario.proveedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(180),
    direccion TEXT,
    nit VARCHAR(50),
    es_activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id)
);

-- 9.2 Kardex (Movimientos de Inventario)
CREATE TABLE inventario.kardex (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES inventario.productos(id),
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
    cantidad INTEGER NOT NULL,
    costo_unitario DECIMAL(12,2),
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    referencia VARCHAR(50),
    referencia_id UUID,
    observacion TEXT,
    usuario_id UUID REFERENCES inventario.usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Columnas requeridas por BaseEntity (la entidad Kardex extiende BaseEntity)
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id)
);

-- 9.3 Devoluciones
CREATE TABLE inventario.devoluciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES inventario.ventas(id),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    motivo TEXT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    impuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('COMPLETADA', 'PENDIENTE', 'ANULADA')),
    usuario_id UUID REFERENCES inventario.usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_devoluciones_montos CHECK (subtotal >= 0 AND impuesto >= 0 AND total >= 0)
);

-- 9.4 Detalle de Devolución
CREATE TABLE inventario.detalle_devolucion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devolucion_id UUID NOT NULL REFERENCES inventario.devoluciones(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES inventario.productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_detalle_dev_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_dev_precio CHECK (precio_unitario >= 0)
);

-- 9.5 Caja (Apertura y Cierre)
CREATE TABLE inventario.caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ,
    monto_inicial DECIMAL(12,2) NOT NULL,
    monto_final DECIMAL(12,2),
    total_ingresos DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_egresos DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    usuario_apertura_id UUID REFERENCES inventario.usuarios(id),
    usuario_cierre_id UUID REFERENCES inventario.usuarios(id),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_caja_monto_inicial CHECK (monto_inicial >= 0)
);

-- 9.6 Cotizaciones
CREATE TABLE inventario.cotizaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    cliente_id UUID REFERENCES inventario.clientes(id),
    fecha_validez DATE,
    subtotal DECIMAL(12,2) NOT NULL,
    impuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA')),
    observaciones TEXT,
    usuario_id UUID REFERENCES inventario.usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_cotizaciones_montos CHECK (subtotal >= 0 AND impuesto >= 0 AND descuento >= 0 AND total >= 0)
);

-- 9.7 Detalle de Cotización
CREATE TABLE inventario.detalle_cotizacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotizacion_id UUID NOT NULL REFERENCES inventario.cotizaciones(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES inventario.productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_detalle_cot_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_cot_precio CHECK (precio_unitario >= 0)
);

-- 9.8 Configuración del Sistema
CREATE TABLE inventario.configuracion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor VARCHAR(500) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    descripcion VARCHAR(255),
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id)
);

-- ============================================================================
-- 10. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índices para Usuarios
CREATE INDEX idx_usuarios_email ON inventario.usuarios(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_rol ON inventario.usuarios(rol_id) WHERE deleted_at IS NULL;

-- Índices para Productos
CREATE INDEX idx_productos_categoria ON inventario.productos(categoria_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_productos_sku ON inventario.productos(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_productos_codigo_barras ON inventario.productos(codigo_barras) WHERE deleted_at IS NULL;
CREATE INDEX idx_productos_nombre ON inventario.productos USING gin(to_tsvector('spanish'::regconfig, nombre));
CREATE INDEX idx_productos_atributos ON inventario.productos USING gin(atributos_dinamicos);
CREATE INDEX idx_productos_stock_bajo ON inventario.productos(stock_actual) WHERE stock_actual <= stock_minimo AND deleted_at IS NULL;

-- Índices para Clientes
CREATE INDEX idx_clientes_documento ON inventario.clientes(numero_documento) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_nombre ON inventario.clientes USING gin(to_tsvector('spanish'::regconfig, nombre || ' ' || apellido));

-- Índices para Ventas
CREATE INDEX idx_ventas_cliente ON inventario.ventas(cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventas_usuario ON inventario.ventas(usuario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ventas_fecha ON inventario.ventas(created_at DESC);
CREATE INDEX idx_ventas_estado ON inventario.ventas(estado);
CREATE INDEX idx_ventas_comprobante ON inventario.ventas(codigo_comprobante);

-- Índices para DetalleVenta
CREATE INDEX idx_detalle_venta ON inventario.detalle_venta(venta_id);
CREATE INDEX idx_detalle_producto ON inventario.detalle_venta(producto_id);

-- Índices para Autorizaciones
CREATE INDEX idx_autorizaciones_estado ON inventario.autorizaciones(estado);
CREATE INDEX idx_autorizaciones_solicitante ON inventario.autorizaciones(solicitante_id);
CREATE INDEX idx_autorizaciones_pendientes ON inventario.autorizaciones(estado)
    WHERE estado = 'PENDIENTE';

-- Índices para Auditoría
CREATE INDEX idx_auditoria_tabla ON inventario.auditoria_log(tabla_afectada, registro_id);
CREATE INDEX idx_auditoria_fecha ON inventario.auditoria_log(created_at DESC);
CREATE INDEX idx_auditoria_usuario ON inventario.auditoria_log(usuario_id);

-- Índices para Fidelización
CREATE INDEX idx_fidelizacion_cliente ON inventario.fidelizacion_historial(cliente_id);
CREATE INDEX idx_fidelizacion_fecha ON inventario.fidelizacion_historial(created_at DESC);

-- ============================================================================
-- 11. FUNCIONES Y TRIGGERS
-- ============================================================================

-- 11.1 Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION inventario.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON inventario.usuarios
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON inventario.productos
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON inventario.clientes
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_ventas_updated_at
    BEFORE UPDATE ON inventario.ventas
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON inventario.roles
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_categorias_updated_at
    BEFORE UPDATE ON inventario.categorias
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
    BEFORE UPDATE ON inventario.proveedores
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_devoluciones_updated_at
    BEFORE UPDATE ON inventario.devoluciones
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_caja_updated_at
    BEFORE UPDATE ON inventario.caja
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_cotizaciones_updated_at
    BEFORE UPDATE ON inventario.cotizaciones
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

CREATE TRIGGER trg_configuracion_updated_at
    BEFORE UPDATE ON inventario.configuracion
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

-- NOTA: trg_reportes_updated_at se movió a la sección 10 (tras crear la tabla
-- inventario.reportes). Antes estaba aquí, referenciando una tabla aún inexistente,
-- lo que abortaba toda la transacción del schema.

-- 11.2 Función para auditoría de Soft Delete
CREATE OR REPLACE FUNCTION inventario.auditar_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        INSERT INTO inventario.auditoria_log (
            tabla_afectada, registro_id, operacion,
            datos_anteriores, datos_nuevos, usuario_id
        ) VALUES (
            TG_TABLE_NAME, OLD.id, 'SOFT_DELETE',
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb,
            NEW.deleted_by
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        INSERT INTO inventario.auditoria_log (
            tabla_afectada, registro_id, operacion,
            datos_anteriores, datos_nuevos, usuario_id
        ) VALUES (
            TG_TABLE_NAME, OLD.id, 'RESTORE',
            row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb,
            NEW.deleted_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_soft_delete_usuarios
    BEFORE UPDATE OF deleted_at ON inventario.usuarios
    FOR EACH ROW EXECUTE FUNCTION inventario.auditar_soft_delete();

CREATE TRIGGER trg_auditar_soft_delete_productos
    BEFORE UPDATE OF deleted_at ON inventario.productos
    FOR EACH ROW EXECUTE FUNCTION inventario.auditar_soft_delete();

CREATE TRIGGER trg_auditar_soft_delete_clientes
    BEFORE UPDATE OF deleted_at ON inventario.clientes
    FOR EACH ROW EXECUTE FUNCTION inventario.auditar_soft_delete();

-- 11.3 Función para registrar historial de precios
CREATE OR REPLACE FUNCTION inventario.registrar_cambio_precio()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.precio_base IS DISTINCT FROM NEW.precio_base THEN
        INSERT INTO inventario.precios_historial (
            producto_id, precio_anterior, precio_nuevo,
            tipo_precio, created_by
        ) VALUES (
            NEW.id, OLD.precio_base, NEW.precio_base,
            'BASE', COALESCE(NEW.deleted_by, (SELECT id FROM inventario.usuarios LIMIT 1))
        );
    END IF;
    IF OLD.precio_mayorista IS DISTINCT FROM NEW.precio_mayorista AND NEW.precio_mayorista IS NOT NULL THEN
        INSERT INTO inventario.precios_historial (
            producto_id, precio_anterior, precio_nuevo,
            tipo_precio, created_by
        ) VALUES (
            NEW.id, OLD.precio_mayorista, NEW.precio_mayorista,
            'MAYORISTA', COALESCE(NEW.deleted_by, (SELECT id FROM inventario.usuarios LIMIT 1))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_precios_historial
    AFTER UPDATE OF precio_base, precio_mayorista ON inventario.productos
    FOR EACH ROW EXECUTE FUNCTION inventario.registrar_cambio_precio();

-- ============================================================================
-- 10. TABLA DE REPORTES PERSONALIZADOS
-- ============================================================================
CREATE TABLE inventario.reportes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(50) NOT NULL,
    filtros JSONB,
    columnas JSONB,
    es_publico BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id UUID REFERENCES inventario.usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES inventario.usuarios(id),
    CONSTRAINT ck_reportes_tipo CHECK (tipo IN ('VENTAS_DIA', 'VENTAS_MES', 'RANKING_CLIENTES', 'INVENTARIO', 'PERSONALIZADO'))
);

-- Trigger updated_at de reportes (movido aquí: la tabla ya existe)
CREATE TRIGGER trg_reportes_updated_at
    BEFORE UPDATE ON inventario.reportes
    FOR EACH ROW EXECUTE FUNCTION inventario.set_updated_at();

-- ============================================================================
-- 12. VISTAS PARA REPORTES
-- ============================================================================

CREATE VIEW inventario.vw_productos_stock_critico AS
SELECT
    p.id,
    p.sku,
    p.nombre,
    c.nombre AS categoria,
    p.stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    (p.stock_actual - p.stock_minimo) AS diferencia_critica,
    CASE
        WHEN p.stock_actual = 0 THEN 'SIN_STOCK'
        WHEN p.stock_actual <= p.stock_minimo * 0.5 THEN 'CRITICO'
        WHEN p.stock_actual <= p.stock_minimo THEN 'BAJO'
        ELSE 'NORMAL'
    END AS nivel_alerta
FROM inventario.productos p
JOIN inventario.categorias c ON c.id = p.categoria_id
WHERE p.deleted_at IS NULL;

-- Vista de resumen de ventas diarias
CREATE VIEW inventario.vw_resumen_ventas_diario AS
SELECT
    DATE(v.created_at) AS fecha,
    COUNT(*) AS total_ventas,
    SUM(v.total) AS ingresos_totales,
    SUM(v.puntos_generados) AS puntos_generados,
    SUM(v.puntos_redimidos) AS puntos_redimidos,
    COUNT(DISTINCT v.cliente_id) AS clientes_atendidos,
    COUNT(DISTINCT v.usuario_id) AS vendedores_activos
FROM inventario.ventas v
WHERE v.deleted_at IS NULL AND v.estado = 'COMPLETADA'
GROUP BY DATE(v.created_at)
ORDER BY fecha DESC;

-- ============================================================================
-- 13. FKs DIFERIDAS (referencias hacia adelante)
-- ============================================================================
-- roles.deleted_by referencia usuarios, pero roles se crea antes que usuarios.
ALTER TABLE inventario.roles
    ADD CONSTRAINT fk_roles_deleted_by FOREIGN KEY (deleted_by)
    REFERENCES inventario.usuarios(id);

COMMIT;
