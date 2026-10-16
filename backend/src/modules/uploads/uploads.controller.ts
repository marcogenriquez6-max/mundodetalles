import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/** Carpeta donde se guardan las imágenes subidas (persistida por volumen en Docker). */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

/** Tipos MIME aceptados y su extensión de archivo. */
const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@ApiTags('Subidas')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UploadsController {
  @Roles('Administrador')
  @Post('imagen')
  @ApiOperation({
    summary: 'Subir imagen',
    description: 'Recibe un archivo de imagen y devuelve su URL pública.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const valido = Boolean(TIPOS_PERMITIDOS[file.mimetype]);
        cb(
          valido
            ? null
            : new BadRequestException(
                'Solo se permiten imágenes JPG, PNG, WEBP o GIF',
              ),
          valido,
        );
      },
    }),
  )
  subirImagen(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const extension = TIPOS_PERMITIDOS[file.mimetype];
    const nombre = `${randomUUID()}.${extension}`;
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    writeFileSync(join(UPLOADS_DIR, nombre), file.buffer);

    return { url: `/api/uploads/${nombre}` };
  }
}
