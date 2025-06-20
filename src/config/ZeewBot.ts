import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import { ICommand } from '../interfaces/ICommand';
import { Logger } from 'winston';
import { WelcomeService } from '../services/WelcomeService';
import { TicketService } from '../services/TicketService';
import { DatabaseService } from '../database/DatabaseService';

export class ZeewBot extends Client implements IBot {
  public commands: Collection<string, ICommand>;
  public logger: Logger;
  public welcomeService: WelcomeService;
  public ticketService: TicketService;
  public database: DatabaseService;

  constructor(logger: Logger) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction
      ],
    });

    this.commands = new Collection();
    this.logger = logger;
    
    // Inicializar servicios
    this.welcomeService = new WelcomeService(this);
    this.ticketService = new TicketService(this);
    this.database = new DatabaseService(process.env.REDIS_URL);
    
    // Agregar servicios al cliente para acceso en eventos
    (this as any).welcomeService = this.welcomeService;
    (this as any).ticketService = this.ticketService;
  }

  public async start(token: string): Promise<void> {
    try {
      // Conectar a la base de datos si está configurada
      await this.database.connect();
      
      // Login
      await this.login(token);
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down bot...');
    
    // Limpiar servicios
    this.welcomeService.cleanup();
    
    // Desconectar de la base de datos
    await this.database.disconnect();
    
    // Destruir el cliente
    this.destroy();
    
    this.logger.info('Bot shut down successfully');
  }
}
