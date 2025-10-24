import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ErrorFactory } from '../errors/error.factory';

@Injectable()
export class AdminGuard implements CanActivate {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // tslint:disable-next-line:triple-equals
    if (request.url.toString() == '/admin/login') {
      return true;
    }
    if (!request.headers.token) {
      ErrorFactory.throwUnauthorized401('No autorizado');
    }
    await this.validateAdminToken(request.headers.token);
    return true;
  }

  private async validateAdminToken(authorizationHeaders: string) {

    let tokenToValidate: string | null = null;

    if (authorizationHeaders.split(' ')[1]) {
      tokenToValidate = authorizationHeaders.split(' ')[1];
    } else {
      tokenToValidate = authorizationHeaders.split(' ')[0];
    }

    const token: any = await jwt.verify(tokenToValidate, process.env.SECRET_ADMIN);

    switch (token.name) {
      case 'JsonWebTokenError':
        return ErrorFactory.throwUnauthorized401('Admin token mal formado');
      case 'TokenExpiredError':
        return ErrorFactory.throwUnauthorized401('El admin token ha caducado');
    }
    return true;
  }
}
