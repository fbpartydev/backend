import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class OnlyAccessGuard implements CanActivate {
  guards: any[];

  constructor(guards: any[]) {
    this.guards = guards;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    for (const guard of this.guards) {
      try {
        const isAuth = await guard.canActivate(context);
        if (isAuth) {
          return true;
        }
      } catch (error) {}
    }
    return false;
  }
}
