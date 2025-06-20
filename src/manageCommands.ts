import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import logger from './utils/logger';
import config from '../config.json';

// Validar variables de entorno
if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is not defined in environment variables');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

async function getClientId(): Promise<string> {
  const application = await rest.get(Routes.oauth2CurrentApplication()) as any;
  return application.id;
}

async function listCommands() {
  try {
    const clientId = await getClientId();
    
    logger.info('📋 Listando comandos actuales...\n');

    // Listar comandos del servidor
    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(clientId, config.guildId)
    ) as any[];

    if (guildCommands.length > 0) {
      logger.info(`Comandos en el servidor (${config.guildId}):`);
      guildCommands.forEach(cmd => {
        logger.info(`  - /${cmd.name} (ID: ${cmd.id}) - ${cmd.description || 'Sin descripción'}`);
      });
    } else {
      logger.info('No hay comandos en el servidor específico.');
    }

    // Listar comandos globales
    const globalCommands = await rest.get(
      Routes.applicationCommands(clientId)
    ) as any[];

    if (globalCommands.length > 0) {
      logger.info('\nComandos globales:');
      globalCommands.forEach(cmd => {
        logger.info(`  - /${cmd.name} (ID: ${cmd.id}) - ${cmd.description || 'Sin descripción'}`);
      });
    } else {
      logger.info('\nNo hay comandos globales.');
    }

    logger.info('\n✅ Listado completo');
  } catch (error) {
    logger.error('Error al listar comandos:', error);
  }
}

async function clearGuildCommands() {
  try {
    const clientId = await getClientId();
    
    logger.info('🗑️  Eliminando comandos del servidor...');
    
    await rest.put(
      Routes.applicationGuildCommands(clientId, config.guildId),
      { body: [] }
    );
    
    logger.info('✅ Comandos del servidor eliminados');
  } catch (error) {
    logger.error('Error al eliminar comandos del servidor:', error);
  }
}

async function clearGlobalCommands() {
  try {
    const clientId = await getClientId();
    
    logger.info('🗑️  Eliminando comandos globales...');
    
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );
    
    logger.info('✅ Comandos globales eliminados');
  } catch (error) {
    logger.error('Error al eliminar comandos globales:', error);
  }
}

async function clearSpecificCommand(commandId: string, isGlobal: boolean = false) {
  try {
    const clientId = await getClientId();
    
    if (isGlobal) {
      await rest.delete(
        Routes.applicationCommand(clientId, commandId)
      );
      logger.info(`✅ Comando global ${commandId} eliminado`);
    } else {
      await rest.delete(
        Routes.applicationGuildCommand(clientId, config.guildId, commandId)
      );
      logger.info(`✅ Comando del servidor ${commandId} eliminado`);
    }
  } catch (error) {
    logger.error('Error al eliminar comando específico:', error);
  }
}

// Menú principal
async function main() {
  const action = process.argv[2];
  const commandId = process.argv[3];

  switch (action) {
    case 'list':
      await listCommands();
      break;
      
    case 'clear-guild':
      await clearGuildCommands();
      break;
      
    case 'clear-global':
      logger.warn('⚠️  ADVERTENCIA: Vas a eliminar TODOS los comandos globales');
      logger.warn('Esto afectará a TODOS los servidores donde esté el bot.');
      logger.warn('Tienes 5 segundos para cancelar (Ctrl+C)...\n');
      
      setTimeout(async () => {
        await clearGlobalCommands();
      }, 5000);
      break;
      
    case 'clear-all':
      logger.warn('⚠️  ADVERTENCIA: Vas a eliminar TODOS los comandos (servidor + globales)');
      logger.warn('Tienes 5 segundos para cancelar (Ctrl+C)...\n');
      
      setTimeout(async () => {
        await clearGuildCommands();
        await clearGlobalCommands();
      }, 5000);
      break;
      
    case 'remove':
      if (!commandId) {
        logger.error('Debes especificar el ID del comando a eliminar');
        logger.info('Uso: npm run manage-commands remove <command-id> [--global]');
        break;
      }
      const isGlobal = process.argv.includes('--global');
      await clearSpecificCommand(commandId, isGlobal);
      break;
      
    default:
      logger.info('🤖 Administrador de Comandos de ZeewBot\n');
      logger.info('Uso: npm run manage-commands <acción>\n');
      logger.info('Acciones disponibles:');
      logger.info('  list              - Lista todos los comandos');
      logger.info('  clear-guild       - Elimina comandos del servidor');
      logger.info('  clear-global      - Elimina comandos globales');
      logger.info('  clear-all         - Elimina TODOS los comandos');
      logger.info('  remove <id>       - Elimina un comando específico');
      logger.info('                      Agrega --global para comandos globales\n');
      logger.info('Ejemplos:');
      logger.info('  npm run manage-commands list');
      logger.info('  npm run manage-commands clear-guild');
      logger.info('  npm run manage-commands remove 123456789 --global');
  }
}

main().catch(console.error);
