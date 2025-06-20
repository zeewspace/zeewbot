import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { IBot } from '../interfaces/IBot';

export class CommandHandler {
  private commands: any[] = [];

  constructor(private client: IBot) {}

  public async loadCommands(): Promise<void> {
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => {
      // En producción solo cargar archivos .js, en desarrollo .ts
      const isProduction = process.env.NODE_ENV === 'production';
      const extension = isProduction ? '.js' : '.ts';
      return file.endsWith(extension) && !file.endsWith('.d.ts');
    });

    for (const file of commandFiles) {
      try {
        const filePath = join(commandsPath, file);
        
        // En producción, usar require para archivos compilados
        // En desarrollo, usar import con pathToFileURL
        let commandModule;
        if (process.env.NODE_ENV === 'production') {
          commandModule = require(filePath);
        } else {
          const fileUrl = pathToFileURL(filePath).href;
          commandModule = await import(fileUrl);
        }
        
        const { command } = commandModule;
        
        if ('data' in command && 'execute' in command) {
          this.client.commands.set(command.data.name, command);
          this.commands.push(command.data.toJSON());
          this.client.logger.info(`Loaded command: ${command.data.name}`);
        } else {
          this.client.logger.warn(`Command at ${file} is missing required properties`);
        }
      } catch (error) {
        this.client.logger.error(`Failed to load command ${file}:`, error);
      }
    }
  }

  public async deployCommands(token: string, clientId: string, guildId: string): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
      this.client.logger.info('Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: this.commands },
      );

      this.client.logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
      this.client.logger.error('Failed to deploy commands:', error);
    }
  }
}
