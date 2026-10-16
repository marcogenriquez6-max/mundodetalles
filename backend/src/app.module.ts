import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermisosModule } from './modules/permisos/permisos.module';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { ProductosModule } from './modules/productos/productos.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { AutorizacionesModule } from './modules/autorizaciones/autorizaciones.module';
import { FidelizacionModule } from './modules/fidelizacion/fidelizacion.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { KardexModule } from './modules/kardex/kardex.module';
import { DevolucionesModule } from './modules/devoluciones/devoluciones.module';
import { CajaModule } from './modules/caja/caja.module';
import { CotizacionesModule } from './modules/cotizaciones/cotizaciones.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { PremiosModule } from './modules/premios/premios.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: typeOrmConfig }),
    AuthModule,
    UsuariosModule,
    RolesModule,
    PermisosModule,
    CategoriasModule,
    ProductosModule,
    ClientesModule,
    VentasModule,
    AutorizacionesModule,
    FidelizacionModule,
    ProveedoresModule,
    KardexModule,
    DevolucionesModule,
    CajaModule,
    CotizacionesModule,
    ConfiguracionModule,
    ReportesModule,
    PremiosModule,
    UploadsModule,
  ],
})
export class AppModule {}
