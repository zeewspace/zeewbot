import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import config from '../../config.json';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('welcomestatus')
    .setDescription('Ver el estado de las bienvenidas pendientes (Solo staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    const welcomeService = (client as any).welcomeService;
    const status = welcomeService.getStatus();

    const embed = new EmbedBuilder()
      .setColor(config.colors.info as any)
      .setTitle('📊 Estado de Bienvenidas Pendientes')
      .setTimestamp();

    if (status.length === 0) {
      embed.setDescription('No hay bienvenidas pendientes en este momento.');
    } else {
      const guildStatus = status.find(s => s.guildId === interaction.guildId);
      
      if (guildStatus) {
        const waitingMinutes = Math.floor(guildStatus.waitingTime / 60000);
        const waitingSeconds = Math.floor((guildStatus.waitingTime % 60000) / 1000);
        
        embed.addFields([
          {
            name: '👥 Miembros esperando',
            value: `${guildStatus.memberCount} usuario(s)`,
            inline: true
          },
          {
            name: '⏱️ Tiempo esperando',
            value: `${waitingMinutes}m ${waitingSeconds}s`,
            inline: true
          },
          {
            name: '⏳ Tiempo restante',
            value: `~${Math.max(0, 15 - waitingMinutes)}m`,
            inline: true
          }
        ]);
      } else {
        embed.setDescription('No hay bienvenidas pendientes en este servidor.');
      }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
