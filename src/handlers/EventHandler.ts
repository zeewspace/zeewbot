import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { IBot } from '../interfaces/IBot';
import { IEvent } from '../interfaces/IEvent';
import { ClientEvents } from 'discord.js';

export class EventHandler {
  constructor(private client: IBot) {}

  public async loadEvents(): Promise<void> {
    const eventsPath = join(__dirname, '..', 'events');
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of eventFiles) {
      try {
        const filePath = join(eventsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        const { event } = await import(fileUrl);
        
        if (event.once) {
          this.client.once(event.name, (...args) => event.execute(this.client, ...args));
        } else {
          this.client.on(event.name, (...args) => event.execute(this.client, ...args));
        }
        
        this.client.logger.info(`Loaded event: ${event.name}`);
      } catch (error) {
        this.client.logger.error(`Failed to load event ${file}:`, error);
      }
    }
  }
}
