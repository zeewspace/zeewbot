import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Comprueba la latencia del bot'),

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    const sent = await interaction.reply({ 
      content: '🏓 Calculando ping...', 
      fetchReply: true 
    });

    const embed = new EmbedBuilder()
      .setColor(0x6D7BB7)
      .setTitle('🏓 Pong!')
      .addFields([
        { 
          name: '📡 Latencia', 
          value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, 
          inline: true 
        },
        { 
          name: '💓 API', 
          value: `${Math.round(client.ws.ping)}ms`, 
          inline: true 
        }
      ])
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
