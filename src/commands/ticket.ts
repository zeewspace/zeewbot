import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Crear un nuevo ticket de soporte')
    .addStringOption(option =>
      option
        .setName('motivo')
        .setDescription('Motivo del ticket')
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.options.getString('motivo');
    const member = interaction.member;

    if (!member || typeof member === 'string') {
      await interaction.editReply('❌ No se pudo obtener tu información de miembro.');
      return;
    }

    try {
      const ticketService = (client as any).ticketService;
      const ticketChannel = await ticketService.createTicket(member, reason);

      const successEmbed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setTitle('✅ Ticket Creado')
        .setDescription(`Tu ticket ha sido creado exitosamente: ${ticketChannel}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error: any) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF67A0)
        .setTitle('❌ Error')
        .setDescription(error.message || 'Ocurrió un error al crear el ticket.')
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
