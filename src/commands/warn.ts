import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import { IWarning } from '../interfaces/IWarning';
import { v4 as uuidv4 } from 'uuid';

export const command: ICommand = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advierte a un usuario del servidor')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario a advertir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('motivo')
                .setDescription('El motivo de la advertencia')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction, client: IBot) {
        const user = interaction.options.getUser('usuario', true);
        const reason = interaction.options.getString('motivo', true);
        const guildId = interaction.guildId;

        if (!guildId) return;

        const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

        if (!member) {
            await interaction.reply({ content: 'El usuario no está en el servidor.', ephemeral: true });
            return;
        }

        if (user.bot) {
            await interaction.reply({ content: 'No puedes advertir a un bot.', ephemeral: true });
            return;
        }

        const warnId = uuidv4().split('-')[0];
        const newWarn: IWarning = {
            id: warnId,
            userId: user.id,
            reason: reason,
            staffId: interaction.user.id,
            date: Date.now()
        };

        const key = `warns:${guildId}:${user.id}`;

        try {
            const currentWarnsData = await client.database.get(key);
            let warns: IWarning[] = [];

            if (currentWarnsData) {
                warns = JSON.parse(currentWarnsData);
            }

            warns.push(newWarn);
            await client.database.set(key, JSON.stringify(warns));

            const embed = new EmbedBuilder()
                .setTitle('Usuario Advertido')
                .setColor('Yellow')
                .addFields(
                    { name: 'Usuario', value: `${user.tag} (${user.id})`, inline: true },
                    { name: 'Staff', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Motivo', value: reason },
                    { name: 'ID Advertencia', value: warnId }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            try {
                await user.send({
                    content: `Has sido advertido en **${interaction.guild?.name}** por: ${reason}`
                });
            } catch (err) {
                // Ignore DM errors
            }

        } catch (error) {
            client.logger.error('Error saving warn', error);
            await interaction.reply({ content: 'Hubo un error al guardar la advertencia.', ephemeral: true });
        }
    }
};
