import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnection,
    VoiceConnectionStatus,
    entersState,
    StreamType,
} from '@discordjs/voice';
import { VoiceBasedChannel, TextBasedChannel, Message, GuildMember } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import { Readable } from 'stream';

interface TTSSession {
    connection: VoiceConnection;
    player: ReturnType<typeof createAudioPlayer>;
    voiceChannelId: string;
    textChannelId: string;
    guildId: string;
    queue: Message[];
    isPlaying: boolean;
}

let edgeTts: typeof import('edge-tts') | null = null;

async function loadEdgeTts(): Promise<typeof import('edge-tts')> {
    if (!edgeTts) {
        edgeTts = await import('edge-tts');
    }
    return edgeTts;
}

export class TTSService {
    private sessions: Map<string, TTSSession> = new Map();
    private client: IBot;

    constructor(client: IBot) {
        this.client = client;
        this.client.on('messageCreate', (message: Message) => this.handleMessage(message));
    }

    public async joinChannel(voiceChannel: VoiceBasedChannel, textChannel: TextBasedChannel): Promise<VoiceConnection> {
        const existing = this.sessions.get(voiceChannel.guild.id);
        if (existing) {
            existing.connection.destroy();
            this.sessions.delete(voiceChannel.guild.id);
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        connection.subscribe(player);

        const session: TTSSession = {
            connection,
            player,
            voiceChannelId: voiceChannel.id,
            textChannelId: textChannel.id,
            guildId: voiceChannel.guild.id,
            queue: [],
            isPlaying: false,
        };

        this.sessions.set(voiceChannel.guild.id, session);

        player.on(AudioPlayerStatus.Idle, () => {
            session.isPlaying = false;
            this.processQueue(session);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                this.sessions.delete(voiceChannel.guild.id);
                connection.destroy();
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.sessions.delete(voiceChannel.guild.id);
        });

        return connection;
    }

    private async handleMessage(message: Message): Promise<void> {
        if (message.author.bot || !message.guild) return;

        const session = this.sessions.get(message.guild.id);
        if (!session) return;

        if (message.channel.id !== session.textChannelId) return;

        const member = message.member as GuildMember;
        if (!member) return;

        const voiceState = member.voice;
        if (!voiceState.channelId || voiceState.channelId !== session.voiceChannelId) return;

        session.queue.push(message);
        if (!session.isPlaying) {
            await this.processQueue(session);
        }
    }

    private async processQueue(session: TTSSession): Promise<void> {
        if (session.queue.length === 0 || session.isPlaying) return;

        const message = session.queue.shift();
        if (!message) return;

        const text = message.content.trim();
        if (!text) return;

        session.isPlaying = true;

        try {
            const edge = await loadEdgeTts();
            const audioBuffer = await edge.tts(text, {
                voice: 'es-MX-DaliaNeural',
                rate: '+0%',
                pitch: '+0Hz',
                volume: '+0%',
            });

            const stream = Readable.from(audioBuffer);
            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
                inlineVolume: false,
            });

            session.player.play(resource);

            await entersState(session.player, AudioPlayerStatus.Playing, 5_000).catch(() => {
                session.isPlaying = false;
                this.processQueue(session);
            });
        } catch {
            session.isPlaying = false;
            this.processQueue(session);
        }
    }

    public leaveChannel(guildId: string): void {
        const session = this.sessions.get(guildId);
        if (session) {
            session.connection.destroy();
            this.sessions.delete(guildId);
        }
    }

    public getSession(guildId: string): TTSSession | undefined {
        return this.sessions.get(guildId);
    }

    public cleanup(): void {
        for (const [, session] of this.sessions) {
            session.connection.destroy();
        }
        this.sessions.clear();
    }
}
