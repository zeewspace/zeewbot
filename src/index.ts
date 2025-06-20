import 'dotenv/config';
import { ZeewBot } from './config/ZeewBot';
import { CommandHandler } from './handlers/CommandHandler';
import { EventHandler } from './handlers/EventHandler';
import logger from './utils/logger';
import config from '../config.json';

// Validar variables de entorno
if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is not defined in environment variables');
  process.exit(1);
}

// Crear instancia del bot
const client = new ZeewBot(logger);

// Función principal
async function main() {
  try {
    // Cargar handlers
    const commandHandler = new CommandHandler(client);
    const eventHandler = new EventHandler(client);

    // Cargar comandos y eventos
    await commandHandler.loadCommands();
    await eventHandler.loadEvents();

    // Iniciar el bot
    await client.start(process.env.DISCORD_TOKEN);

    // Desplegar comandos cuando el bot esté listo
    client.once('ready', async () => {
      if (client.user) {
        await commandHandler.deployCommands(
          process.env.DISCORD_TOKEN!,
          client.user.id,
          config.guildId
        );
      }
    });

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Manejar señales de cierre
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await client.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await client.shutdown();
  process.exit(0);
});

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Iniciar el bot
main();
