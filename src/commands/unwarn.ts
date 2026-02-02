import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import { IWarning } from '../interfaces/IWarning';

export const command: ICommand = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Gestión de advertencias de un usuario')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario a gestionar')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction, client: IBot) {
        const targetUser = interaction.options.getUser('usuario', true);
        const guildId = interaction.guildId;

        if (!guildId) return;

        const key = `warns:${guildId}:${targetUser.id}`;
        let warns: IWarning[] = [];

        try {
            const data = await client.database.get(key);
            if (data) {
                warns = JSON.parse(data);
            }
        } catch (error) {
            client.logger.error('Error fetching warns', error);
            await interaction.reply({ content: 'Error al obtener datos.', ephemeral: true });
            return;
        }

        if (warns.length === 0) {
            await interaction.reply({
                content: `El usuario ${targetUser.username} no tiene advertencias.`,
                ephemeral: true
            });
            return;
        }

        const getMainMenuPayload = () => {
            const embed = new EmbedBuilder()
                .setTitle(`Gestión de Advertencias - ${targetUser.username}`)
                .setColor('Blue')
                .setDescription('Selecciona una advertencia de la lista para ver detalles o gestionarla.')
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields({ name: 'Total de advertencias', value: warns.length.toString() });

            if (warns.length === 0) {
                embed.setDescription('El usuario ya no tiene advertencias.');
                return { embeds: [embed], components: [] };
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_warn')
                .setPlaceholder('Selecciona una advertencia');

            warns.forEach(warn => {
                const label = `ID: ${warn.id}`;
                let description = warn.reason;
                if (description.length > 50) description = description.substring(0, 47) + '...';

                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(label)
                        .setDescription(description)
                        .setValue(warn.id)
                );
            });

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

            return { embeds: [embed], components: [row] };
        };

        const response = await interaction.reply({
            ...getMainMenuPayload(),
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000
        });

        const btnCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        let selectedWarnId: string | null = null;

        collector.on('collect', async i => {
            selectedWarnId = i.values[0];
            const warn = warns.find(w => w.id === selectedWarnId);

            if (!warn) {
                await i.update(getMainMenuPayload());
                return;
            }

            const detailEmbed = new EmbedBuilder()
                .setTitle(`Detalle de Advertencia - ID: ${warn.id}`)
                .setColor('Yellow')
                .addFields(
                    { name: 'Usuario', value: `${targetUser.tag}`, inline: true },
                    { name: 'Staff', value: `<@${warn.staffId}>`, inline: true },
                    { name: 'Fecha', value: new Date(warn.date).toLocaleString(), inline: true },
                    { name: 'Motivo', value: warn.reason }
                );

            const btnRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_back')
                        .setLabel('Volver')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('btn_edit')
                        .setLabel('Editar Motivo')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('btn_delete')
                        .setLabel('Eliminar')
                        .setStyle(ButtonStyle.Danger)
                );

            await i.update({ embeds: [detailEmbed], components: [btnRow] });
        });

        btnCollector.on('collect', async i => {
            if (i.customId === 'btn_back') {
                selectedWarnId = null;
                await i.update(getMainMenuPayload());
            } else if (i.customId === 'btn_delete') {
                if (!selectedWarnId) return;

                warns = warns.filter(w => w.id !== selectedWarnId);
                await client.database.set(key, JSON.stringify(warns));

                selectedWarnId = null;
                await i.update(getMainMenuPayload());
            } else if (i.customId === 'btn_edit') {
                if (!selectedWarnId) return;
                const warn = warns.find(w => w.id === selectedWarnId);
                if (!warn) return;

                const modal = new ModalBuilder()
                    .setCustomId('edit_reason_modal')
                    .setTitle('Editar Motivo');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('new_reason')
                    .setLabel('Nuevo Motivo')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(warn.reason)
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
                modal.addComponents(firstActionRow);

                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({
                        time: 60000,
                        filter: (m) => m.customId === 'edit_reason_modal' && m.user.id === i.user.id
                    });

                    const newReason = submitted.fields.getTextInputValue('new_reason');
                    warn.reason = newReason;

                    const index = warns.findIndex(w => w.id === selectedWarnId);
                    if (index !== -1) {
                        warns[index] = warn;
                    }

                    await client.database.set(key, JSON.stringify(warns));

                    const detailEmbed = new EmbedBuilder()
                        .setTitle(`Detalle de Advertencia - ID: ${warn.id}`)
                        .setColor('Yellow')
                        .addFields(
                            { name: 'Usuario', value: `${targetUser.tag}`, inline: true },
                            { name: 'Staff', value: `<@${warn.staffId}>`, inline: true },
                            { name: 'Fecha', value: new Date(warn.date).toLocaleString(), inline: true },
                            { name: 'Motivo', value: warn.reason }
                        );

                    const btnRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('btn_back')
                                .setLabel('Volver')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('btn_edit')
                                .setLabel('Editar Motivo')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId('btn_delete')
                                .setLabel('Eliminar')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await submitted.update({ embeds: [detailEmbed], components: [btnRow] });

                } catch (err) {
                    // Modal timeout or error
                }
            }
        });
    }
};
