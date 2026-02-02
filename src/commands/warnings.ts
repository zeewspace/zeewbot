import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import { IWarning } from '../interfaces/IWarning';

export const command: ICommand = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Muestra las advertencias de un usuario')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario a consultar')
                .setRequired(true)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction, client: IBot) {
        const user = interaction.options.getUser('usuario', true);
        const guildId = interaction.guildId;

        if (!guildId) return;

        const key = `warns:${guildId}:${user.id}`;

        try {
            const data = await client.database.get(key);

            if (!data) {
                await interaction.reply({ content: `${user.username} no tiene advertencias.`, ephemeral: true });
                return;
            }

            const warns: IWarning[] = JSON.parse(data);

            if (warns.length === 0) {
                await interaction.reply({ content: `${user.username} no tiene advertencias.`, ephemeral: true });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`Advertencias de ${user.username}`)
                .setColor('Orange')
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: `Total: ${warns.length}` });

            warns.forEach(warn => {
                embed.addFields({
                    name: `ID: ${warn.id} | ${new Date(warn.date).toLocaleDateString()}`,
                    value: `**Motivo:** ${warn.reason}\n**Staff:** <@${warn.staffId}>`
                });
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            client.logger.error('Error fetching warns', error);
            await interaction.reply({ content: 'Error al obtener las advertencias.', ephemeral: true });
        }
    }
};
