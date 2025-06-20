#!/bin/bash

# Script para detener todos los servicios

echo "🛑 Stopping ZeewBot services..."

# Detener servicios de producción
docker-compose down

# Detener servicios de desarrollo
docker-compose -f docker-compose.dev.yml down

echo "✅ All services stopped"
