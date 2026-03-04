import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import { ICommand } from '../interfaces/ICommand';
import { Logger } from 'winston';
import { WelcomeService } from '../services/WelcomeService';
import { TicketService } from '../services/TicketService';
import { TTSService } from '../services/TTSService';
import { DatabaseService } from '../database/DatabaseService';

export class ZeewBot extends Client implements IBot {
  public commands: Collection<string, ICommand>;
  public logger: Logger;
  public welcomeService: WelcomeService;
  public ticketService: TicketService;
  public ttsService: TTSService;
  public database: DatabaseService;

  constructor(logger: Logger) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
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

    this.welcomeService = new WelcomeService(this);
    this.ticketService = new TicketService(this);
    this.ttsService = new TTSService(this);
    this.database = new DatabaseService(process.env.REDIS_URL);

  }

  public async start(token: string): Promise<void> {
    try {
      await this.database.connect();

      await this.login(token);
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down bot...');

    this.welcomeService.cleanup();
    this.ttsService.cleanup();

    await this.database.disconnect();

    this.destroy();

    this.logger.info('Bot shut down successfully');
  }
}
