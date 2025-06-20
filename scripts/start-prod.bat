@echo off
echo 🚀 Building ZeewBot for production...

REM Verificar si existe .env
if not exist .env (
    echo ❌ Error: .env file not found!
    echo Please copy .env.example to .env and configure it.
    exit /b 1
)

REM Construir la imagen
docker-compose build

REM Iniciar los servicios
echo 🎯 Starting services...
docker-compose up -d

REM Mostrar logs
echo 📋 Showing logs (Ctrl+C to exit)...
docker-compose logs -f bot
