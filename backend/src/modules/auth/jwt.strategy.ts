import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    });
  }

  async validate(payload: { sub: string }) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub },
      relations: ['rol'],
    });

    if (!usuario || !usuario.esActivo) {
      throw new UnauthorizedException();
    }
    return usuario;
  }
}
