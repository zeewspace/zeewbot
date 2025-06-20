import { Events, GuildMember } from 'discord.js';
import { IEvent } from '../interfaces/IEvent';
import { IBot } from '../interfaces/IBot';

export const event: IEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  
  async execute(client: IBot, member: GuildMember) {
    client.logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);
    
    // Manejar bienvenida
    const welcomeService = (client as any).welcomeService;
    if (welcomeService) {
      await welcomeService.handleNewMember(member);
    }
  },
};
