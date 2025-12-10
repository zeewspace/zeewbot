import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';

export const command: ICommand = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Elimina una cantidad de mensajes')
        .addIntegerOption(option =>
            option
                .setName('cantidad')
                .setDescription('Cantidad de mensajes a eliminar (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction, client: IBot) {
        const amount = interaction.options.getInteger('cantidad', true);
        const channel = interaction.channel;

        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
            await interaction.reply({ content: 'No puedo eliminar mensajes en este canal.', ephemeral: true });
            return;
        }

        try {
            const deleted = await channel.bulkDelete(amount, true);

            await interaction.reply({
                content: `✅ Se han eliminado ${deleted.size} mensajes.`,
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                content: '❌ Hubo un error al eliminar los mensajes. Asegúrate de que no tengan más de 14 días de antigüedad.',
                ephemeral: true
            });
        }
    },
};
