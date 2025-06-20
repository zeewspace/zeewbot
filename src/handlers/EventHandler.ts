import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { IBot } from '../interfaces/IBot';

export class EventHandler {
  constructor(private client: IBot) {}

  public async loadEvents(): Promise<void> {
    const eventsPath = join(__dirname, '..', 'events');
    const eventFiles = readdirSync(eventsPath).filter(file => {
      // En producción solo cargar archivos .js, en desarrollo .ts
      const isProduction = process.env.NODE_ENV === 'production';
      const extension = isProduction ? '.js' : '.ts';
      return file.endsWith(extension) && !file.endsWith('.d.ts');
    });

    for (const file of eventFiles) {
      try {
        const filePath = join(eventsPath, file);
        
        // En producción, usar require para archivos compilados
        // En desarrollo, usar import con pathToFileURL
        let eventModule;
        if (process.env.NODE_ENV === 'production') {
          eventModule = require(filePath);
        } else {
          const fileUrl = pathToFileURL(filePath).href;
          eventModule = await import(fileUrl);
        }
        
        const { event } = eventModule;
        
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
