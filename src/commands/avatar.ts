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
        const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        const guildAvatarUrl = member?.avatarURL({ size: 1024, extension: 'png' }) ?? null;
        const globalAvatarUrl = targetUser.avatarURL({ size: 1024, extension: 'png' });
        const defaultAvatarUrl = guildAvatarUrl ?? globalAvatarUrl ?? targetUser.defaultAvatarURL;
        const hasGuildAvatar = !!guildAvatarUrl;
        const hasGlobalAvatar = !!globalAvatarUrl;

        const buildDownloadRow = (baseUrl: string): ActionRowBuilder<ButtonBuilder> => {
            const toFormat = (url: string, ext: 'png' | 'jpg' | 'webp'): string => {
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

        const buildGuildEmbed = (): EmbedBuilder => {
            return new EmbedBuilder()
                .setImage(defaultAvatarUrl)
                .setColor(0x5865F2);
        };

        const buildGlobalEmbed = (): EmbedBuilder => {
            return new EmbedBuilder()
                .setImage(globalAvatarUrl!)
                .setColor(0x5865F2);
        };

        const downloadRow = buildDownloadRow(defaultAvatarUrl);

        const components: ActionRowBuilder<ButtonBuilder>[] = [downloadRow];

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
