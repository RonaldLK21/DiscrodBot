import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

console.log('Client ID:', clientId);
console.log('Guild ID:', guildId);

if (!clientId || !guildId) {
    console.error('Client ID and Guild ID must be set in the environment variables.');
    process.exit(1);
}

const commands = [
    {
        name: 'join',
        description: 'Make the bot join your voice channel',
    },
    {
        name: 'leave',
        description: 'Make the bot leave the voice channel',
    },
];

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();
