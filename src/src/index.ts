// Require the necessary discord.js classes
import { Client, IntentsBitField } from 'discord.js';
import mongoose from 'mongoose';
import { registerCommands } from './commands/deployCommands';
import { startRaffleCron } from './lib/raffleCron';

process.setMaxListeners(100);

// Create a new client instance
const client = new Client({ intents: [IntentsBitField.Flags.Guilds] });

// Check all required environment variables
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('Missing DISCORD_BOT_TOKEN environment variable');
    process.exit(1);
}
if (!process.env.DISCORD_CLIENT_ID) {
    console.error('Missing DISCORD_CLIENT_ID environment variable');
    process.exit(1);
}

// Initialize Mongoose
mongoose.connect('mongodb://mongodb:27017/eve-discord-bot', {}).then(() => {

    registerCommands(client);

    // When the client is ready, run this code (only once)
    client.once('ready', () => {
        console.log(`Logged in as ${client.user?.tag}`);
        // Start the raffle cron job
        startRaffleCron(client);
        console.log(`Ready on ${client.guilds.cache.size} servers!`);
    });

    client.on('guildDelete', guild => {
        if (guild.name === undefined) return;

        console.log(`Got kicked from a Server!\n- Name: ${guild.name}\n- Member Count: ${guild.memberCount}\nI'm now in ${client.guilds.cache.size} Servers!`);
    });

    //  joined a server
    client.on('guildCreate', guild => {
        if (guild.name === undefined) return;

        console.log(`Joined new Server!\n- Name: ${guild.name}\n- Member Count: ${guild.memberCount}\nI'm now in ${client.guilds.cache.size} Servers!`);
        //  Your other stuff like adding to guildArray
    });

    // Login to Discord with your client's token
    client.login(process.env.DISCORD_BOT_TOKEN);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

