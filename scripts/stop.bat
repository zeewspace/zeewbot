@echo off
echo 🛑 Stopping ZeewBot services...

REM Detener servicios de producción
docker-compose down

REM Detener servicios de desarrollo
docker-compose -f docker-compose.dev.yml down

echo ✅ All services stopped
