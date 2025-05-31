import cron from 'node-cron';
import { ActionRowBuilder, ButtonBuilder, Client, MessageActionRowComponentBuilder, TextChannel, ButtonStyle } from 'discord.js';
import RaffleSchema from '../models/raffle';
import RaffleWinnersSchema from '../models/raffleWinners';

export function startRaffleCron(client : Client<boolean>) {
    // Cron every minute
    cron.schedule('* * * * *', async () => {
        const currentTime = new Date();
        const timestamp = currentTime.getTime();

        try {
            // Lets first cleanup all raffles that are older than 30 days
            const thirtyDaysAgo = timestamp - (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
            await RaffleSchema.deleteMany({ raffleEndTimestamp: { $lt: thirtyDaysAgo } });
            console.log('Cleaned up raffles older than 30 days.');

            // Try to get raffle's that ended in the last minute
            const raffles = await RaffleSchema.find({
                raffleEndTimestamp: { $lte: timestamp },
                drawn: false,
            });

            if (raffles.length === 0) {
                console.log('No raffles to process.');
                return;
            }
            console.log(`Processing ${raffles.length} raffles that ended.`);

            for (const raffle of raffles) {
                const guild = client.guilds.cache.get(raffle.guildId);
                if (!guild) {
                    console.error(`Guild not found for raffle ${raffle.raffleId}`);
                    continue;
                }

                const channel = <TextChannel> guild.channels.cache.get(raffle.channelId);
                if (!channel) {
                    console.error(`Channel not found or not a text channel for raffle ${raffle.raffleId}`);
                    continue;
                }

                const message = raffle.messageId ? await channel.messages.fetch(raffle.messageId).catch(() => null) : null;
                if (raffle.messageId && !message) {
                    console.error(`Message not found for raffle ${raffle.raffleId}`);
                    continue;
                }

                // Get reactions from the message if it exists for our ticket emoji
                const ticketEmoji = '🎟️'; // Replace with your actual ticket emoji
                const reactions = message ? message.reactions.cache.get(ticketEmoji) : null;
                let participants: string[] = [];
                if (reactions) {
                    // Fetch users who reacted with the ticket emoji
                    participants = await reactions.users.fetch().then(users => users.map(user => user.id));
                    // Filter out the bot user
                    participants = participants.filter(userId => userId !== client.user?.id);
                }

                // Here you would implement the logic to draw winners and notify them
                // For example, you might send a message to the channel with the winners
                console.log(`Drawing winners for raffle ${raffle.raffleId} in channel ${channel.name}`);
                if (participants.length === 0) {
                    console.log(`No participants for raffle ${raffle.raffleId}`);
                    await channel.send(`No participants for raffle **${raffle.name}**., no winners drawn.`);

                    // send unused codes to the owner if there are any
                    if (raffle.codes && raffle.codes.length > 0) {
                        const owner = guild.members.cache.get(raffle.ownerId);
                        if (owner) {
                            try {
                                await owner.send(`The raffle **${raffle.name}** has ended with no participants. \n Codes left: \n${raffle.codes.join('\n')}\n Please check the channel <#${channel.id}> for more details.`);
                            }
                            catch (dmError) {
                                console.error(`Could not send DM to raffle owner ${raffle.ownerId}:`, dmError);
                            }
                        }
                    }

                    continue;
                }
                const winners: string[] = [];
                const numberOfWinners = Math.min(raffle.numberOfWinners, participants.length);
                // Draw winners, make sure we don't draw the same user twice
                while (winners.length < numberOfWinners) {
                    const winner = participants[Math.floor(Math.random() * participants.length)];
                    if (!winners.includes(winner)) {
                        winners.push(winner);
                    }
                }

                // Notify winners in the channel with a Claim button
                const winnerMentions = winners.map(winnerId => `<@${winnerId}>`).join(', ');

                const button = new ButtonBuilder().setCustomId('claim_raffle-' + raffle.raffleId).setLabel('Claim Prize').setStyle(ButtonStyle.Primary);
                const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(button);
                const allCodes = [];
                if (raffle.codes && raffle.codes.length > 0) {
                    allCodes.push(...raffle.codes);
                }

                // Write the winners to the database
                for (const winnerId of winners) {
                    await RaffleWinnersSchema.create({
                        raffleId: raffle.raffleId,
                        userId: winnerId,
                        username: guild.members.cache.get(winnerId)?.user.username || 'Unknown',
                        code: allCodes.length > 0 ? allCodes.shift() : null, // Assign a code if available
                        claimed: false,
                    });

                    // Try to send a DM to the winner and mark it as claimed if successful
                    const winnerMember = guild.members.cache.get(winnerId);
                    if (winnerMember) {
                        try {
                            await winnerMember.send(`Congratulations! You have won the raffle **${raffle.name}**! Please claim your prize by clicking the button in channel <#${channel.id}>.`);
                        }
                        catch (dmError) {
                            console.error(`Could not send DM to ${winnerId}:`, dmError);
                            // If DM fails, we can still notify in the channel
                        }
                    }
                }

                await channel.send({
                    content: `Congratulations ${winnerMentions}! You have won the raffle **${raffle.name}**!`,
                    components: raffle.codes && raffle.codes.length > 0 ? [actionRow] : [],
                });

                // Edit the original message if it exists to show the number of participants
                if (message) {
                    await message.edit({
                        content: `Raffle **${raffle.name}** has ended! Number of participants: ${participants.length}. Winners: ${winnerMentions}`,
                    });
                }

                // Mark the raffle as drawn
                raffle.drawn = true;
                raffle.unusedCodes = allCodes; // Store remaining codes if any
                await raffle.save();

                // Try notify the owner of the raffle if there is still codes left
                if (raffle.unusedCodes && raffle.unusedCodes.length > 0) {
                    const owner = guild.members.cache.get(raffle.ownerId);
                    if (owner) {
                        try {
                            await owner.send(`The raffle **${raffle.name}** has ended. \n Codes left: \n${raffle.unusedCodes.join('\n')}\n Please check the channel <#${channel.id}> for the winners.`);
                        }
                        catch (dmError) {
                            console.error(`Could not send DM to raffle owner ${raffle.ownerId}:`, dmError);
                        }
                    }
                    else {
                        console.error(`Owner not found for raffle ${raffle.raffleId} (${raffle.ownerId})`);
                    }
                }
            }

        }
        catch (error) {
            console.error('Error fetching raffles:', error);
            return;
        }
    });

    console.log('Raffle cron job started.');
}