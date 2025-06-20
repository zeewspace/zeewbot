import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { IBot } from '../interfaces/IBot';
import { ICommand } from '../interfaces/ICommand';

export class CommandHandler {
  private commands: any[] = [];

  constructor(private client: IBot) {}

  public async loadCommands(): Promise<void> {
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
      try {
        const filePath = join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        const { command } = await import(fileUrl);
        
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
