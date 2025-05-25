import {
    ActionRowBuilder, ButtonInteraction,
    ChatInputCommandInteraction, Client,
    ModalBuilder, ModalSubmitInteraction, TextChannel,
    TextInputBuilder,
    TextInputStyle,
} from 'discord.js';
import * as uuid from 'uuid';
import { SlashCommandBuilder } from '@discordjs/builders';
import { AbstractCommand } from './abstractCommand';
import RaffleSchema from '../models/raffle';
import RaffleWinnersSchema from '../models/raffleWinners';

export class RaffleCommands extends AbstractCommand {
    protected override name = 'hraffle';
    private readonly modalIds = [
        'startRaffleModal',
        'startRaffleModalCodes',
    ];
    private readonly buttonIds = [
        'claim_raffle-',
    ];

    override async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand(true);
        if (subcommand === 'start') {
            // Get the option to automatically provide codes to winners
            const provideCodes = interaction.options.getBoolean('provide_codes', false) ?? false;

            // Open a modal to start a new raffle
            const modal = new ModalBuilder()
                .setCustomId('startRaffleModal' + (provideCodes ? 'Codes' : ''))
                .setTitle('Start a new raffle');

            // TextInput for raffle name
            const raffleNameInput = new TextInputBuilder()
                .setCustomId('raffleNameInput')
                .setLabel('Raffle Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const raffleNameActionRow : ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(raffleNameInput);

            // TextInput for raffle description
            const raffleDescriptionInput = new TextInputBuilder()
                .setCustomId('raffleDescriptionInput')
                .setLabel('Raffle Description')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            const raffleDescriptionActionRow : ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(raffleDescriptionInput);

            // Raffle end-timestamp in format YYYY-MM-DD HH:mm
            const raffleEndInput = new TextInputBuilder()
                .setCustomId('raffleEndInput')
                .setLabel('End Timestamp - 2022-12-31 22:41')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const raffleEndActionRow : ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(raffleEndInput);

            modal.addComponents(
                raffleNameActionRow,
                raffleDescriptionActionRow,
                raffleEndActionRow,
            );

            // Optional number of winners
            const raffleWinnersInput = new TextInputBuilder()
                .setCustomId('raffleWinnersInput')
                .setLabel('Number of Winners')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            const raffleWinnersActionRow : ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(raffleWinnersInput);

            // Optional instructions sent when sending out codes to winners
            const raffleInstructionsInput = new TextInputBuilder()
                .setCustomId('raffleInstructionsInput')
                .setLabel('Instructions for Winners')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);
            const raffleInstructionsActionRow : ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(raffleInstructionsInput);

            // Optional codes for the raffle to automatically give to winners
            const raffleCodesInput = new TextInputBuilder()
                .setCustomId('raffleCodesInput')
                .setLabel('Raffle Codes (one per line)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            const raffleCodesActionRow : ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(raffleCodesInput);

            if (provideCodes) {
                modal.addComponents(
                    raffleInstructionsActionRow,
                    raffleCodesActionRow,
                );
            }
            else {
                modal.addComponents(
                    raffleWinnersActionRow,
                );
            }

            await interaction.showModal(modal);
        }
        else if (subcommand === 'end') {
            // End a raffle by ID
            const raffleId = interaction.options.getString('raffle_id', true);

            // Find the raffle in the database
            const raffle = await RaffleSchema.findOne({ raffleId: raffleId, guildId: interaction.guildId, channelId: interaction.channelId });
            if (!raffle) {
                await interaction.reply({ content: `No active raffle found with ID: \`${raffleId}\` in this channel.`, ephemeral: true });
                return;
            }
            // Check if the raffle is already drawn
            if (raffle.drawn) {
                await interaction.reply({ content: `Raffle with ID: \`${raffleId}\` has already been drawn.`, ephemeral: true });
                return;
            }

            // draw the raffle
            await raffle.deleteOne({ raffleId: raffleId, guildId: interaction.guildId, channelId: interaction.channelId });

            await interaction.reply({ content: `Raffle with ID: \`${raffleId}\` has been ended successfully.`, ephemeral: true });
        }
        else if (subcommand === 'list') {
            // Get all active raffles
            const raffles = await RaffleSchema.find({ drawn: false, guildId: interaction.guildId, channelId: interaction.channelId });
            if (raffles.length === 0) {
                await interaction.reply({ content: 'No active raffles found in this channel.', ephemeral: true });
                return;
            }
            // Format the list of raffles
            const raffleList = raffles.map(raffle => {
                return `**Raffle ID:** \`${raffle.raffleId}\`\n` +
                    `**Name:** ${raffle.name || 'No Name'}\n` +
                    `**Description:** ${raffle.description || 'No Description'}\n` +
                    `**Instructions:** ${raffle.codeInstructions || 'No Instructions'}\n` +
                    `**Description:** ${raffle.description || 'No Description'}\n` +
                    `**Owner:** <@${raffle.ownerId}>\n` +
                    `**Has Codes:** ${raffle.codes && raffle.codes.length > 0 ? 'Yes' : 'No'}\n` +
                    `**Number of Winners:** ${raffle.numberOfWinners}\n` +
                    `**End Date:** ${new Date(raffle.raffleEndTimestamp).toLocaleString()}\n`;
            }).join('\n\n');

            await interaction.reply({ content: `**Active Raffles in this Channel:**\n\n${raffleList}`, ephemeral: true });
        }
    }

    async executeModal(interaction: ModalSubmitInteraction, client: Client<boolean>): Promise<void> {
        // Get the modal ID to determine which modal was submitted
        const modalId = interaction.customId;
        let codes: string[] | undefined;
        let numberOfWinners = 0;
        if (modalId.endsWith('Codes')) {
            // If the modal is for starting a raffle with codes, get the codes
            codes = interaction.fields.getTextInputValue('raffleCodesInput')?.split('\n').map(code => code.trim()) || undefined;
        }
        else {
            numberOfWinners = parseInt(interaction.fields.getTextInputValue('raffleWinnersInput'));
            console.log('Number of winners:', numberOfWinners);
        }

        if (numberOfWinners < 1 && !codes) {
            await interaction.reply({ content: 'You must provide at least one winner or codes!', ephemeral: true });
            return;
        }
        if (numberOfWinners < 1 && codes && codes.length < 1) {
            await interaction.reply({ content: 'You must provide at least one code!', ephemeral: true });
            return;
        }
        numberOfWinners = Math.max(numberOfWinners, codes ? codes.length : 0);

        // if number of winners is 0, throw an error
        if (numberOfWinners < 1) {
            await interaction.reply({ content: 'You must provide at least one winner!', ephemeral: true });
            return;
        }

        // Validate the end timestamp format
        const endTimestamp = interaction.fields.getTextInputValue('raffleEndInput');
        if (!endTimestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/) || isNaN(Date.parse(endTimestamp))) {
            await interaction.reply({ content: 'Invalid end timestamp format. Please use YYYY-MM-DD HH:mm.', ephemeral: true });
            return;
        }
        // Check if the timestamp is in the future
        const endDate = new Date(endTimestamp);
        if (endDate <= new Date()) {
            await interaction.reply({ content: 'The end timestamp must be in the future.', ephemeral: true });
            return;
        }

        const raffleId = uuid.v4(); // Generate a unique raffle ID
        if (!interaction.channelId) {
            await interaction.reply({ content: 'Could not find the channel to send the raffle message.', ephemeral: true });
            return;
        }

        // Send message to the channel where the raffle was started
        const channel = <TextChannel> client.channels.cache.get(interaction.channelId);
        if (!channel || !channel.isTextBased()) {
            await interaction.reply({ content: 'Could not find the channel to send the raffle message with ID: `' + raffleId + '`', ephemeral: true });
            return;
        }
        const message = await channel.send(`A new raffle has been started by <@${interaction.user.id}>!\n` +
            `**Raffle Name:** ${interaction.fields.getTextInputValue('raffleNameInput')}\n` +
            `**Description:** ${interaction.fields.getTextInputValue('raffleDescriptionInput')}\n` +
            `**Raffle ends at:** <t:${Math.floor(endDate.getTime() / 1000)}>\n` +
            `**Number of Winners:** ${numberOfWinners}`);

        // Add reactions to the message for users to enter the raffle
        await message.react('🎟️'); // Ticket emoji for entering the raffle

        // Create new raffle inside the mongo database
        await RaffleSchema.create({
            raffleId: raffleId,
            guildId: interaction.guildId,
            messageId: message.id,
            ownerId: interaction.user.id,
            name: interaction.fields.getTextInputValue('raffleNameInput'),
            description: interaction.fields.getTextInputValue('raffleDescriptionInput'),
            channelId: interaction.channelId,
            numberOfWinners: numberOfWinners,
            codeInstructions: modalId.endsWith('Codes') ? interaction.fields.getTextInputValue('raffleInstructionsInput') : undefined,
            codes: codes,
            raffleEndTimestamp: endDate.getTime(),
            drawn: false,
        });

        await interaction.reply({ content: 'Your submission was received successfully!\n **Raffle Id:** `' + raffleId + '`', ephemeral: true });
    }

    async executeButton(interaction: ButtonInteraction, client: Client) {
        // Get the person who clicked the button
        const userId = interaction.user.id;
        // Remove the 'claim_raffle-' prefix to get the raffle ID
        const raffleId = interaction.customId.replace('claim_raffle-', '');

        // Check if the user is a winner of the raffle
        const winner = await RaffleWinnersSchema.findOne({
            raffleId: raffleId,
            userId: userId,
        });
        if (!winner) {
            await interaction.reply({ content: 'You are not a winner of this raffle.', ephemeral: true });
            return;
        }
        // If the user is a winner, check if the winner object has a code
        if (!winner.code || winner.code === '') {
            await interaction.reply({ content: 'You have already claimed your prize or no code was provided for this raffle.', ephemeral: true });
            return;
        }
        // Find the raffle in the database to get the instructions
        const raffle = await RaffleSchema.findOne({ raffleId: raffleId, guildId: interaction.guildId, channelId: interaction.channelId, drawn: true });
        if (!raffle) {
            await interaction.reply({ content: 'Raffle not found or not drawn yet.', ephemeral: true });
            return;
        }
        // Send the code to the user
        const code = winner.code;
        const instructions = raffle.codeInstructions || 'No instructions provided.';
        await interaction.reply({
            content: 'Congratulations! You have claimed your prize!\n' +
                `**Code:** ${code}\n` +
                `**Instructions:** ${instructions}`,
            ephemeral: true,
        });

        // Mark the winner as claimed
        winner.claimed = true;
        await winner.save();
    }

    getRegisteredModalIds(): string[] {
        return this.modalIds;
    }

    getRegisteredButtonIdPrefixes(): string[] {
        return this.buttonIds;
    }

    getCommand(): SlashCommandBuilder {
        const slashCommand = new SlashCommandBuilder().setName(this.name)
            .setDescription('Raffle commands');

        slashCommand.addSubcommand(subcommand =>
            subcommand.setName('start')
                .setDescription('Start a new raffle')
                .addBooleanOption(option =>
                    // automatically provide codes to winners
                    option.setName('provide_codes')
                        .setDescription('Automatically provide codes to winners')
                        .setRequired(false),
                )
            ,
        );

        slashCommand.addSubcommand(subcommand =>
            subcommand.setName('end')
                .setDescription('End the current raffle by id')
                .addStringOption(option =>
                    option.setName('raffle_id')
                        .setDescription('The ID of the raffle to end')
                        .setRequired(true),
                ),
        );

        slashCommand.addSubcommand(subcommand =>
            subcommand.setName('list')
                .setDescription('List all active raffles'),
        );

        return slashCommand;
    }
}