import { Client, Collection } from 'discord.js';
import { ICommand } from './ICommand';
import { Logger } from 'winston';
import { DatabaseService } from '../database/DatabaseService';

export interface IBot extends Client {
  commands: Collection<string, ICommand>;
  logger: Logger;
  database: DatabaseService;
}
