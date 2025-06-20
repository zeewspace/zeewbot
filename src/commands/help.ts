import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import config from '../../config.json';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles'),

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary as any)
      .setTitle('🚀 Comandos de ZeewBot')
      .setDescription('Aquí están todos los comandos disponibles:')
      .addFields([
        {
          name: '🎫 Tickets',
          value: '`/ticket [motivo]` - Crear un ticket de soporte',
          inline: false
        },
        {
          name: '📊 Información',
          value: '`/help` - Muestra esta ayuda\n`/ping` - Comprueba la latencia del bot',
          inline: false
        }
      ])
      .setFooter({ text: 'ZeewBot • Zeew Space', iconURL: client.user?.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
