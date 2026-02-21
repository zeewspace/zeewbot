import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder,
} from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';

export const command: ICommand = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Muestra el avatar de un usuario')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('El usuario del que quieres ver el avatar (por defecto: tú mismo)')
                .setRequired(false)
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction, _client: IBot) {
        const targetUser = interaction.options.getUser('usuario') ?? interaction.user;

        // Intentar obtener el miembro del servidor para acceder al avatar de servidor
        const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);

        // Avatar de servidor (guild-specific) — puede ser null si no tiene
        const guildAvatarUrl = member?.avatarURL({ size: 1024, extension: 'png' }) ?? null;

        // Avatar global
        const globalAvatarUrl = targetUser.avatarURL({ size: 1024, extension: 'png' });

        // Avatar a mostrar por defecto: el de servidor si existe, si no el global
        const defaultAvatarUrl = guildAvatarUrl ?? globalAvatarUrl ?? targetUser.defaultAvatarURL;

        // Determinar si tiene avatar de servidor distinto al global
        const hasGuildAvatar = !!guildAvatarUrl;
        // Determinar si tiene avatar global (distinto del por defecto del sistema)
        const hasGlobalAvatar = !!globalAvatarUrl;

        /**
         * Genera los 3 botones de descarga (PNG, JPG, WEBP) para una URL de avatar dada.
         * Se reemplaza la extensión y se asegura el tamaño 1024.
         */
        const buildDownloadRow = (baseUrl: string): ActionRowBuilder<ButtonBuilder> => {
            const toFormat = (url: string, ext: 'png' | 'jpg' | 'webp'): string => {
                // Reemplazar la extensión en la URL de CDN de Discord
                return url.replace(/\.(png|jpg|jpeg|webp|gif)(\?.*)?$/, `.${ext}?size=1024`);
            };

            return new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('PNG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(toFormat(baseUrl, 'png')),
                new ButtonBuilder()
                    .setLabel('JPG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(toFormat(baseUrl, 'jpg')),
                new ButtonBuilder()
                    .setLabel('WEBP')
                    .setStyle(ButtonStyle.Link)
                    .setURL(toFormat(baseUrl, 'webp')),
            );
        };

        /**
         * Construye el embed del avatar de servidor.
         */
        const buildGuildEmbed = (): EmbedBuilder => {
            return new EmbedBuilder()
                .setImage(defaultAvatarUrl)
                .setColor(0x5865F2);
        };

        /**
         * Construye el embed del avatar global.
         */
        const buildGlobalEmbed = (): EmbedBuilder => {
            return new EmbedBuilder()
                .setImage(globalAvatarUrl!)
                .setColor(0x5865F2);
        };

        // Fila de descarga para el avatar por defecto (servidor o global si no tiene de servidor)
        const downloadRow = buildDownloadRow(defaultAvatarUrl);

        // Componentes de la respuesta principal
        const components: ActionRowBuilder<ButtonBuilder>[] = [downloadRow];

        // Si tiene avatar de servidor Y tiene avatar global, mostramos el botón "Ver avatar global"
        if (hasGuildAvatar && hasGlobalAvatar) {
            const globalBtnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('show_global_avatar')
                    .setLabel('Ver avatar global')
                    .setStyle(ButtonStyle.Primary),
            );
            components.push(globalBtnRow);
        }

        const response = await interaction.reply({
            embeds: [buildGuildEmbed()],
            components,
        });

        // Solo escuchamos el colector si hay botón de avatar global
        if (!hasGuildAvatar || !hasGlobalAvatar) return;

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.customId === 'show_global_avatar',
            time: 120_000,
        });

        collector.on('collect', async i => {
            const globalDownloadRow = buildDownloadRow(globalAvatarUrl!);

            await i.reply({
                embeds: [buildGlobalEmbed()],
                components: [globalDownloadRow],
                ephemeral: true,
            });
        });
    },
};
