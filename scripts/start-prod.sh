#!/bin/bash

# Script para construir y ejecutar el bot en producción

echo "🚀 Building ZeewBot for production..."

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Construir la imagen
docker-compose build

# Iniciar los servicios
echo "🎯 Starting services..."
docker-compose up -d

# Mostrar logs
echo "📋 Showing logs (Ctrl+C to exit)..."
docker-compose logs -f bot
