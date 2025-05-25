import { Client } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { AbstractCommand } from './abstractCommand';
import { RaffleCommands } from './raffleCommands';

const commands: AbstractCommand[] = [
    new RaffleCommands(),
];

export function registerCommands(client: Client) {
    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN || '');


    rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''), { body: commands.map(command => command.getCommand().toJSON()) })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);


    // When the client is ready, run this code (only once)
    client.once('ready', () => {
        client.on('interactionCreate', interaction => {
            try {
                if (!interaction.isCommand() && !interaction.isModalSubmit() && !interaction.isButton()) return;

                if (interaction.isButton()) {
                    for (const command of commands) {
                        const buttons = command.getRegisteredButtonIdPrefixes();
                        if (buttons.some(prefix => interaction.customId.startsWith(prefix))) {
                            command.executeButton(interaction, client);
                            return;
                        }
                    }
                    return;
                }

                if (interaction.isModalSubmit()) {
                    for (const command of commands) {
                        const modals = command.getRegisteredModalIds();
                        if (modals.includes(interaction.customId)) {
                            command.executeModal(interaction, client);
                            return;
                        }
                    }
                    return;
                }
                for (const command of commands) {
                    if (command.getName() === interaction.commandName) {
                        command.executeCommand(interaction);
                        break;
                    }
                }
            }
            catch (error) {
                console.error('Error handling interaction:', error);
            }
        });
    });
}