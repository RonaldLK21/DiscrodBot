import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus } from '@discordjs/voice';
import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import { PassThrough } from 'stream';
import { Filter } from 'bad-words';
import OpenAI from 'openai';
import prism from 'prism-media';
import fs from 'fs';


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const censoredUsers = new Set();

// Create a new Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const shortTermMemory = new Map();
const longTermMemory = {};

// Store user details in long-term memory
function storeUserDetails(userId, userName) {
    if (!longTermMemory[userId]) {
        longTermMemory[userId] = { name: userName, preferences: {} };
    }
}

// Update user preferences in long-term memory
function updateUserPreferences(userId, key, value) {
    if (longTermMemory[userId]) {
        longTermMemory[userId].preferences[key] = value;
    }
}

// Log in the bot
client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => console.log('Bot logged in successfully!'))
    .catch(err => console.error('Failed to log in:', err));

// Initialize Google Cloud clients
const speechClient = new speech.SpeechClient();
const ttsClient = new textToSpeech.TextToSpeechClient();

// When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Add custom words to the blacklist
const filter = new Filter();
filter.addWords(
    'anal', 'anus', 'arse', 'ass', 'ballsack', 'balls', 'bastard',
    'bitch', 'biatch', 'bloody', 'blowjob', 'bollock', 'bollok',
    'boner', 'cock', 'crap', 'cunt', 'dick', 'fuck', 'nigger',
    'nigga', 'penis', 'pussy', 'slut', 'whore'
);

const swearCounts = new Map();
const insults = fs
    .readFileSync('./insults.txt', 'utf8')
    .split('\n')
    .map(insult => insult.trim())
    .filter(insult => insult.length > 0);
 const censorCounts = {};



//interactiom handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
        const question = interaction.options.getString('question');

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful Discord bot. Keep replies short and casual.' },
                    { role: 'user', content: question }
                ],
            });

            const botReply = response.choices[0].message.content;
            return interaction.reply(botReply);
        } catch (error) {
            console.error(error);
            return interaction.reply('something not good 😭');
        }
    }

    if (interaction.commandName === 'join') {
        if (!interaction.member.voice.channel) {
            return interaction.reply('You need to be in a voice channel first!');
        }

        joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        return interaction.reply(`Joined ${interaction.member.voice.channel.name}!`);
    }

    if (interaction.commandName === 'leave') {
        const connection = getVoiceConnection(interaction.guild.id);

        if (connection) {
            connection.destroy();
            return interaction.reply('Disconnected from the voice channel!');
        }

        return interaction.reply('I am not in a voice channel!');
    }

    if (interaction.commandName === 'censored') {
        if (Object.keys(censorCounts).length === 0) {
            return interaction.reply('Nobody has been censored yet 👀');
        }

        let leaderboard = '🚨 **Censorship Leaderboard** 🚨\n\n';

        for (const userId in censorCounts) {
            const user = await client.users.fetch(userId);
            leaderboard += `**${user.username}:** ${censorCounts[userId]}\n`;
        }

        return interaction.reply(leaderboard);
    }

    if (interaction.commandName === 'ping') {
        return interaction.reply('WHAT ????');
    }
if (interaction.commandName === 'whoistheproblem') {

    if (Object.keys(censorCounts).length === 0) {
        return interaction.reply('Nobody is the problem yet 👀');
    }

    let worstUserId = null;
    let highestCount = 0;

    for (const userId in censorCounts) {

        if (censorCounts[userId] > highestCount) {
            highestCount = censorCounts[userId];
            worstUserId = userId;
        }
    }

    const user = await client.users.fetch(worstUserId);

    return interaction.reply(
        `🚨 **The Problem User Is:** ${user.username}\n` +
        `💀 Censored ${highestCount} times`
    );
}

if (interaction.commandName === 'insult') {
    const members = await interaction.guild.members.fetch();

    const humanMembers = members.filter(member =>
        !member.user.bot
    );
    const randomMember = humanMembers.random();
    const randomInsult =
    insults[Math.floor(Math.random() * insults.length)];
    return interaction.reply(
        `🚨 ${randomMember} ${randomInsult}`
    );
}

if (interaction.commandName === 'coinflip') {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';

    return interaction.reply(`🪙 ${result}!`);
}

if (interaction.commandName === 'd20') {
    const roll = Math.floor(Math.random() * 20) + 1;

    return interaction.reply(`🎲 You rolled a **${roll}**!`);
}

if (interaction.commandName === 'target') {

    const user = interaction.options.getUser('user');

    censoredUsers.add(user.id);

    return interaction.reply(
        `🚨 ${user.username} is now targeted.`
    );
}

if (interaction.commandName === 'untarget') {

    const user = interaction.options.getUser('user');

    censoredUsers.delete(user.id);

    return interaction.reply(
        `✅ ${user.username} has been freed.`
    );
}

});


client.on('messageCreate', async (message) => {
    // Handle user names and preferences
    if (message.content.startsWith('!setname')) {
        const newName = message.content.split(' ')[1];
        storeUserDetails(message.author.id, newName);
        message.reply(`Name set to ${newName}!`);
    }

    if (message.author.bot) return;

    function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Bot command help
if (message.content === '!' || message.content === '!help') {
    return message.reply(`
**Bot Commands **
\`!join\` - Join your voice channel
\`!leave\` - Leave the voice channel
\`!censored\` - Show censorship leaderboard
\`!ping\` - Test if bot is alive
    `);
}


    // Troll version Make sure to add ID
    

    
    const bannedWords = fs 
    .readFileSync('./badwords.txt', 'utf8')
    .split('\n')
    .map(word => word.trim())
    .filter(word=> word.length > 0);
    




if (censoredUsers.has(message.author.id)) {

    let censoredMessage = message.content;

    bannedWords.forEach(word => {
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');

        censoredMessage = censoredMessage.replace(
            regex,
            'x'.repeat(word.length)
        );
    });

    if (censoredMessage !== message.content) {

        if (!censorCounts[message.author.id]) {
            censorCounts[message.author.id] = 0;
        }

        censorCounts[message.author.id]++;

        try {
            await message.delete();

            return message.channel.send(
                `**${message.author.username}:** ${censoredMessage}\n Censored Count: ${censorCounts[message.author.id]}`
            );

        } catch (error) {
            console.error('Censor error:', error);
        }
    }
}
    // AI ASK Command

   /* if (message.content.startsWith('!ask ')) {
        const userInput = message.content.slice(5).trim();

        if (!userInput) {
            return message.reply('Ask me somethign after !ask');
        }
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a bot'
                    },
                    {
                        role: 'user',
                        content: userInput
                    }
                ],
            });
            const botReply = response.choices[0].message.content;
            return message.reply(botReply);

        } catch(error) { 
            console.error(error);
            return message.reply('something not good');
        }
        
    }*/

    // Censor leaderboard
    if (message.content === '!censored') {

    if (Object.keys(censorCounts).length === 0) {
        return message.reply('Nobody has been censored yet 👀');
    }

    let leaderboard = ' **Censorship Leaderboard** 🚨\n\n';

    for (const userId in censorCounts) {

        const user = await client.users.fetch(userId);

        leaderboard += `${user.username}: ${censorCounts[userId]}\n`;
    }

    return message.reply(leaderboard);
}


    // Command to join the voice channel
    if (message.content === '!join') {
        if (message.member.voice.channel) {
            console.log(`User ${message.author.tag} is trying to join the channel: ${message.member.voice.channel.id}`);

            try {
                const connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: false,
                });

                connection.on('stateChange', (oldState, newState) => {
                    if (newState.status === 'connected') {
                        console.log('Bot has connected to the channel!');
                        listenForSpeech(connection); // Start listening for speech
                    } else if (newState.status === 'disconnected') {
                        console.log('Bot has disconnected from the channel.');
                    }
                });

                message.reply(`Joined ${message.member.voice.channel.name}!`);
            } catch (error) {
                console.error('Error joining voice channel:', error);
                message.reply('There was an error trying to join the voice channel.');
            }
        } else {
            message.reply('You need to be in a voice channel to use this command!');
        }
    }

    // Command to leave the voice channel
    if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.reply('Disconnected from the voice channel!');
        } else {
            message.reply('I am not in a voice channel!');
        }
    }

    // Command for the bot to say something
    if (message.content.startsWith('!say')) {
        const textToSay = message.content.slice(5).trim(); // Get the text after the command
        const connection = getVoiceConnection(message.guild.id);

        if (connection) {
            await speak(connection, textToSay);
        } else {
            message.reply('I need to be in a voice channel to speak!');
        }
    }
});


// Function to listen for speech in the voice channel
async function listenForSpeech(connection) {
    const audioStream = new PassThrough();

    connection.on('speaking', (user, speaking) => {
        if (speaking) {
            console.log(`User ${user.tag} is speaking.`);
            const receiver = connection.receiver;
            const audio = receiver.subscribe(user.id, {
                end: {
                    behavior: 'manual',
                },
            });

            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 1, rate: 48000 });
            audio.pipe(opusDecoder).pipe(audioStream);
        }
    });

    const request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
        },
        interimResults: false,
    };

    const recognizeStream = speechClient
        .streamingRecognize(request)
        .on('data', async (data) => {
            const transcription = data.results[0]?.alternatives[0]?.transcript;
            if (transcription) {
                console.log(`Transcription: ${transcription}`);
                for (const [userId, member] of connection.channel.members) {
                    console.log(`Checking speech from user ${member.user.tag} (${userId}) for swearing.`);
                    if (filter.isProfane(transcription)) {
                        await handleSwearing(connection, userId);
                    } else {
                        await handleIntelligentResponse(connection, transcription, userId);
                    }
                }
            }
        })
        .on('error', (error) => {
            console.error('Error with speech recognition:', error);
        });

    audioStream.pipe(recognizeStream);
}

// Function to handle swearing
async function handleSwearing(connection, userId) {
    const count = swearCounts.get(userId) || 0;
    console.log(`Swearing detected for user ${userId}. Current count: ${count}`);

    if (count < 2) {
        swearCounts.set(userId, count + 1);
        await speak(connection, `Warning! That's a bad word. This is your ${count + 1} time.`);
    } else if (count === 2) {
        swearCounts.set(userId, count + 1);
        await speak(connection, `That's your third warning! You will be muted for 3 seconds.`);

        const member = connection.channel.members.get(userId);
        if (member) {
            await member.voice.setMute(true); // Mute the user
            console.log(`User ${member.user.tag} has been muted for swearing.`);
            setTimeout(async () => {
                await member.voice.setMute(false); // Unmute after 3 seconds
                console.log(`User ${member.user.tag} has been unmuted.`);
                swearCounts.delete(userId); // Reset the user's swear count
            }, 3000);
        }
    }
}

// Handle intelligent responses using OpenAI's API
async function handleIntelligentResponse(connection, userInput, userId) {
    try {
        // Process the response from OpenAI
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: userInput }],
        });

        const botReply = response.choices[0].message.content;
        console.log(`Bot response: ${botReply}`);

        // Update short-term memory
        if (!shortTermMemory.has(userId)) {
            shortTermMemory.set(userId, []);
        }
        const userMemory = shortTermMemory.get(userId);
        userMemory.push(userInput, botReply);

        // Limit memory size to the last 5 interactions
        if (userMemory.length > 10) {
            userMemory.splice(0, 2); // Remove the oldest two interactions
        }

        await speak(connection, botReply);
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        await speak(connection, 'I\'m sorry, I could not understand that.');
    }
}

// Function to convert text to speech and play it in the voice channel
async function speak(connection, text) {
    const request = {
        input: { text: text },
        voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        const [response] = await ttsClient.synthesizeSpeech(request);
        const audioResource = createAudioResource(response.audioContent);
        const player = createAudioPlayer();

        player.play(audioResource);
        connection.subscribe(player); // Ensure to subscribe the connection

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Finished playing audio.');
            player.stop();
        });

        player.on('error', error => {
            console.error('Error with audio player:', error);
        });
    } catch (error) {
        console.error('Error with text-to-speech:', error);
    }
}

// Log any errors
client.on('error', console.error);
