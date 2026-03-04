import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnection,
    VoiceConnectionStatus,
    entersState,
    StreamType,
    NoSubscriberBehavior,
} from '@discordjs/voice';
import { VoiceBasedChannel, TextBasedChannel, Message, GuildMember } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { PassThrough } from 'stream';

import ffmpeg from 'ffmpeg-static';
import prism from 'prism-media';

process.env.FFMPEG_PATH = require('ffmpeg-static');

interface TTSSession {
    connection: VoiceConnection;
    player: ReturnType<typeof createAudioPlayer>;
    voiceChannelId: string;
    textChannelId: string;
    guildId: string;
    queue: Message[];
    isPlaying: boolean;
}

export class TTSService {
    private sessions: Map<string, TTSSession> = new Map();
    private client: IBot;

    constructor(client: IBot) {
        this.client = client;
        this.client.on('messageCreate', (message: Message) => this.handleMessage(message));
    }

    private async createEngine(): Promise<MsEdgeTTS> {
        const engine = new MsEdgeTTS();
        await engine.setMetadata('es-MX-DaliaNeural', OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
        return engine;
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
            selfDeaf: true,
        });

        connection.on('error', () => { });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

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

        player.on('error', () => {
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
            const connState = session.connection.state.status;
            if (connState !== VoiceConnectionStatus.Ready) {
                try {
                    await entersState(session.connection, VoiceConnectionStatus.Ready, 30_000);
                } catch {
                    // Reintentar la reconexión
                    session.connection.rejoin();
                    await entersState(session.connection, VoiceConnectionStatus.Ready, 20_000);
                }
            }
            const engine = await this.createEngine();
            const { audioStream } = engine.toStream(text);

            const chunks: Buffer[] = [];
            for await (const chunk of audioStream) {
                chunks.push(Buffer.from(chunk));
            }

            const fullBuffer = Buffer.concat(chunks);

            if (fullBuffer.length === 0) {
                session.isPlaying = false;
                this.processQueue(session);
                return;
            }

            const stream = new PassThrough();
            stream.end(fullBuffer);

            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary, // ffmpeg lo transcodifica
                silencePaddingFrames: 5,
            });

            session.player.play(resource);

            await entersState(session.player, AudioPlayerStatus.Playing, 5_000);
        } catch (error) {
            session.isPlaying = false;
            this.processQueue(session);
        }
    }

    public leaveChannel(guildId: string): void {
        const session = this.sessions.get(guildId);
        if (session) {
            session.player.stop();
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
