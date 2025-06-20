#!/bin/bash

# Script para ver logs

echo "📋 Showing ZeewBot logs..."
echo "Use Ctrl+C to exit"
echo ""

# Verificar si es producción o desarrollo
if [ "$1" == "dev" ]; then
    docker-compose -f docker-compose.dev.yml logs -f bot
else
    docker-compose logs -f bot
fi
