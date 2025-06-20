@echo off
echo 🚀 Starting ZeewBot in development mode...

REM Verificar si existe .env
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and configure it.
    exit /b 1
)

REM Iniciar los servicios en modo desarrollo
docker-compose -f docker-compose.dev.yml up --build
