# Antia - Plataforma de Pronósticos Deportivos

## 🎯 Descripción

Plataforma completa para venta de pronósticos deportivos con:
- **3 Roles**: Cliente, Tipster, Admin/SuperAdmin
- **Pagos**: Mollie, Binance Pay, PayNet Easy
- **Bot Telegram**: Gestión de accesos y notificaciones
- **Sistema de Referidos**: Casas de apuestas con comisiones
- **Liquidaciones**: Con fees escalonados por volumen

## 🛠️ Stack Tecnológico

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS + shadcn/ui
- **Bot**: Node.js + Telegraf
- **Infra**: Docker Compose

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Yarn

### Setup Inicial

```bash
# 1. Clonar variables de entorno
cp .env.example .env

# 2. Levantar servicios (PostgreSQL + Redis)
docker-compose up -d

# 3. Instalar dependencias del backend
cd backend
yarn install

# 4. Ejecutar migraciones de base de datos
yarn prisma migrate dev
yarn prisma db seed

# 5. Instalar dependencias del frontend
cd ../frontend
yarn install

# 6. Instalar dependencias del bot
cd ../bot
yarn install
```

## 🚀 Ejecución

### Modo Desarrollo

```bash
# Terminal 1 - Backend
cd backend
yarn start:dev

# Terminal 2 - Frontend
cd frontend
yarn dev

# Terminal 3 - Bot
cd bot
yarn dev

# Terminal 4 - Workers (Jobs)
cd backend
yarn start:worker
```

### Modo Producción

```bash
# Build
cd backend && yarn build
cd ../frontend && yarn build
cd ../bot && yarn build

# Run
cd backend && yarn start:prod
cd ../frontend && yarn start
cd ../bot && yarn start
```

## 📚 Documentación API

Una vez levantado el backend, accede a:
- Swagger UI: http://localhost:8001/api/docs
- OpenAPI JSON: http://localhost:8001/api/docs-json

## 🗄️ Base de Datos

### Migraciones

```bash
cd backend
yarn prisma migrate dev --name nombre_migracion
```

### Seeders

```bash
cd backend
yarn prisma db seed
```

Crea:
- 1 SuperAdmin
- 1 Tipster aprobado
- 1 Cliente
- 2 Productos (ONE_TIME + SUBSCRIPTION)
- 1 Casa de apuestas demo
- 10 eventos de referidos demo

### Prisma Studio

```bash
cd backend
yarn prisma studio
```

Abre en: http://localhost:5555

## 🤖 Telegram Bot

### Crear Bot Real

1. Hablar con @BotFather en Telegram
2. Crear nuevo bot con `/newbot`
3. Copiar el token
4. Actualizar `TELEGRAM_BOT_TOKEN` en `.env`
5. Reiniciar el servicio del bot

### Comandos del Bot Cliente

- `/start` - Iniciar y onboarding
- `/acceder` - Acceder a canales
- `/mis_compras` - Ver historial de compras
- `/renovar` - Renovar suscripciones
- `/mi_cuenta` - Gestionar perfil
- `/soporte` - Abrir ticket de soporte
- `/legales` - Ver términos y condiciones

## 💳 Integraciones de Pago

### Mollie

1. Crear cuenta en https://www.mollie.com
2. Obtener API Key
3. Actualizar `MOLLIE_API_KEY` en `.env`

### Binance Pay

1. Crear cuenta merchant en Binance
2. Obtener API Key + Secret
3. Actualizar `BINANCE_API_KEY` y `BINANCE_SECRET_KEY` en `.env`

### PayNet Easy

1. Contactar con PayNet para cuenta merchant
2. Obtener credenciales
3. Actualizar `PAYNET_API_KEY` y `PAYNET_MERCHANT_ID` en `.env`

## 🔗 Sistema de Referidos

### Añadir Nueva Casa de Apuestas

1. Ir a Panel Admin > Casas de Apuestas
2. Crear nueva casa con método (API/CSV/Email)
3. Configurar adaptador según documentación de la casa
4. Probar integración

### Adaptadores Disponibles

- **API**: Polling automático cada 15-60 min
- **CSV**: Upload manual de archivos
- **Email**: Parsing de emails con eventos

## 📊 Monitoreo

### Health Checks

- Backend: http://localhost:8001/health
- Frontend: http://localhost:3000/api/health

### Logs

```bash
# Backend
tail -f backend/logs/app.log

# Bot
tail -f bot/logs/bot.log
```

## 🧪 Testing

```bash
# Unit tests
cd backend && yarn test

# E2E tests
cd backend && yarn test:e2e

# Frontend tests
cd frontend && yarn test
```

## 🔒 Seguridad

- JWT con cookies HttpOnly + CSRF
- Rate limiting por IP y usuario
- Webhooks firmados con HMAC
- Validación +18 en todos los flujos
- Auditoría completa de cambios

## 📝 Licencia

Propietario - Todos los derechos reservados

## 👥 Soporte

Para soporte, contactar a: soporte@antia.com
