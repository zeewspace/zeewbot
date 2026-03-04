import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, MessageFlags } from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';

export const command: ICommand = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Unirse al canal de voz para leer mensajes con TTS'),

    async execute(interaction: ChatInputCommandInteraction, client: IBot) {
        const member = interaction.member as GuildMember;

        if (!member?.voice?.channel) {
            await interaction.reply({
                content: '❌ Debes estar en un canal de voz para usar este comando.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const voiceChannel = member.voice.channel;
        const textChannel = interaction.channel;

        if (!textChannel) {
            await interaction.reply({
                content: '❌ No se pudo determinar el canal de texto.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!client.ttsService) {
            await interaction.reply({
                content: '❌ El servicio de TTS no está disponible.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        client.ttsService.joinChannel(voiceChannel, textChannel);

        await interaction.reply({
            content: `🔊 Conectado a **${voiceChannel.name}**. Los mensajes enviados aquí serán leídos en voz alta.`,
        });
    },
};
