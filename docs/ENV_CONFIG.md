# Configuración de Variables de Entorno

Para que el sistema de cookies de Facebook funcione correctamente, necesitas agregar la siguiente variable a tu archivo `.env`:

```env
# Cookie Secret Key (32 bytes hex)
# Esta clave se usa para encriptar las cookies de Facebook
COOKIE_SECRET_KEY='c4be57c3a7519f2d965eecf7c4a087d6a63ca28030a7fe7f0f60019bf8350c27'
```

## Generar una nueva clave

Si prefieres generar tu propia clave:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y agrégalo a tu archivo `.env`.

## Configuración completa del .env

```env
# Database Configuration
DATABASE_HOST='aws-0-us-east-2.pooler.supabase.com'
DATABASE_NAME='postgres'
DATABASE_USER='postgres.bupjctquyydnydnsdkeg'
DATABASE_PORT='6543'
DATABASE_PASSWORD='aGm*NF_5KD_8@CU'
DATABASE_SSLMODE='require'
DATABASE_POOLER='base-pooler.x'

# Cookie Secret Key (32 bytes hex)
COOKIE_SECRET_KEY='c4be57c3a7519f2d965eecf7c4a087d6a63ca28030a7fe7f0f60019bf8350c27'

# JWT Secret (add your JWT secret here)
JWT_SECRET='your-jwt-secret-here'

# Server Port
PORT=3000
```

