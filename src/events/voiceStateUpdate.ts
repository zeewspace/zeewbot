import { Events, VoiceState } from 'discord.js';
import { IEvent } from '../interfaces/IEvent';
import { IBot } from '../interfaces/IBot';

export const event: IEvent<Events.VoiceStateUpdate> = {
    name: Events.VoiceStateUpdate,

    async execute(client: IBot, oldState: VoiceState, newState: VoiceState) {
        if (!client.ttsService) return;

        const guildId = oldState.guild.id;
        const session = client.ttsService.getSession(guildId);
        if (!session) return;

        // Si el bot se movió o fue desconectado, verificar si aún está en el canal correcto
        if (oldState.member?.id === client.user?.id) {
            if (!newState.channelId || newState.channelId !== session.voiceChannelId) {
                client.ttsService.leaveChannel(guildId);
                return;
            }
        }

        // Si alguien se salió del canal donde está el bot
        if (oldState.channelId === session.voiceChannelId && newState.channelId !== session.voiceChannelId) {
            const channel = oldState.channel;
            if (!channel) return;

            // Contar humanos en el canal
            const humans = channel.members.filter(m => !m.user.bot);

            if (humans.size === 0) {
                client.ttsService.leaveChannel(guildId);
            }
        }
    },
};
