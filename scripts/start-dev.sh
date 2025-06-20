#!/bin/bash

# Script para ejecutar el bot en modo desarrollo

echo "🚀 Starting ZeewBot in development mode..."

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Iniciar los servicios en modo desarrollo
docker-compose -f docker-compose.dev.yml up --build
