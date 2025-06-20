import { ClientEvents } from 'discord.js';
import { IBot } from './IBot';

export interface IEvent<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (client: IBot, ...args: ClientEvents[K]) => Promise<void> | void;
}
