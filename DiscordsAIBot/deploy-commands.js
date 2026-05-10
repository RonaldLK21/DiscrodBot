import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
   /* new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI something')
        .addStringOption(option =>
            option
                .setName('question')
                .setDescription('What do you want to ask?')
                .setRequired(true)
        ),*/

    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join your voice channel'),

    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leave the voice channel'),

    new SlashCommandBuilder()
        .setName('censored')
        .setDescription('Show censorship leaderboard'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('checks if bot alive'),
    new SlashCommandBuilder()
        .setName('whoistheproblem')
        .setDescription('Shows the most censored user'),
    new SlashCommandBuilder()
        .setName('insult')
        .setDescription('It insults a random member of the group'),

     new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin'),

    new SlashCommandBuilder()
        .setName('d20')
        .setDescription('Roll a D20'),

    new SlashCommandBuilder()
        .setName('target')
        .setDescription('Target a user for censorship')
        .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to target')
            .setRequired(true)),

    new SlashCommandBuilder()
        .setName('untarget')
        .setDescription('Remove a user from censorship')
        .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to untarget')
            .setRequired(true)),
        new SlashCommandBuilder()
            .setName('insulttarget')
            .setDescription('Insult a specific user')
            .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to insult')
            .setRequired(true)
    ),

    new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Sets a reminder for you or someone else')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription(' time like 10s, 5m, 2h')
                .setRequired(true)
        )
        .addStringOption(option =>  
            option                
                .setName('message')
                .setDescription('The reminder message')
                .setRequired(true)
        )
        .addUserOption(option =>
            option       
                 .setName('user')
                .setDescription('The user to remind (optional)')
                .setRequired(false)
        ),
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);



try {
    console.log('Registering slash commands...');
        
    await rest.put(
       Routes.applicationCommands(
            process.env.CLIENT_ID
        ),
        { body: commands }
    );

    console.log('Slash commands registered!');
} catch (error) {
   // console.error(error);
}