import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FidelizacionHistorial } from '../../entities/fidelizacion-historial.entity';
import { Cliente } from '../../entities/cliente.entity';
import { NIVELES, umbralesNivel } from '../../common/negocio.util';

@Injectable()
export class FidelizacionService {
  constructor(
    @InjectRepository(FidelizacionHistorial) private readonly repo: Repository<FidelizacionHistorial>,
    @InjectRepository(Cliente) private readonly clienteRepo: Repository<Cliente>,
  ) {}

  async historial(clienteId: string) {
    return this.repo.find({
      where: { clienteId },
      relations: ['venta', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Resumen del programa para un cliente: saldo, nivel, puntos acumulados y
   * canjeados, y cuántos puntos le faltan para el siguiente nivel.
   */
  async resumen(clienteId: string) {
    const cliente = await this.clienteRepo.findOne({ where: { id: clienteId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const historial = await this.repo.find({ where: { clienteId } });
    const sumar = (tipo: string) =>
      historial.filter((h) => h.tipoOperacion === tipo).reduce((sum, h) => sum + h.puntos, 0);
    const totalAcumulado = sumar('ACUMULACION');
    const totalRedimido = Math.abs(sumar('REDENCION'));
    const totalAjustes = sumar('AJUSTE');

    const umbrales = await umbralesNivel(this.repo.manager);
    const indiceActual = NIVELES.indexOf(cliente.nivelFidelizacion as any);
    const siguienteNivel = indiceActual >= 0 && indiceActual < NIVELES.length - 1 ? NIVELES[indiceActual + 1] : null;
    const puntosSiguiente = siguienteNivel ? umbrales[siguienteNivel] : null;

    return {
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        nombreCompleto: `${cliente.nombre} ${cliente.apellido}`,
        tipoDocumento: cliente.tipoDocumento,
        numeroDocumento: cliente.numeroDocumento,
        nivel: cliente.nivelFidelizacion,
        nivelFidelizacion: cliente.nivelFidelizacion,
        puntosActuales: cliente.puntosAcumulados,
      },
      resumen: {
        totalAcumulado,
        totalRedimido,
        totalAjustes,
        cantidadOperaciones: historial.length,
        totalTransacciones: historial.length,
      },
      progreso: {
        nivelActual: cliente.nivelFidelizacion,
        siguienteNivel,
        puntosSiguienteNivel: puntosSiguiente,
        puntosFaltantes: puntosSiguiente !== null ? Math.max(0, puntosSiguiente - cliente.puntosAcumulados) : 0,
        umbrales,
      },
    };
  }
}
