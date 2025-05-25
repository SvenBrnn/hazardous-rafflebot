import { SlashCommandBuilder } from '@discordjs/builders';
import {
    ButtonInteraction,
    Client,
    CommandInteraction,
    ModalSubmitInteraction,
} from 'discord.js';

export abstract class AbstractCommand {
    protected name = '';

    public getName() : string {
        return this.name;
    }

    public getCommand(): SlashCommandBuilder {
        throw new Error('Not implemented yet');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public executeCommand(interaction: CommandInteraction): void {
        throw new Error('Not implemented yet');
    }

    public executeModal(interaction: ModalSubmitInteraction, client: Client<boolean>): void {
        throw new Error('Not implemented yet');
    }

    public getRegisteredModalIds(): string[] {
        return [];
    }

    public getRegisteredButtonIdPrefixes() : string[] {
        return [];
    }

    public executeButton(interaction: ButtonInteraction, client: Client) {
        throw new Error('Not implemented yet');
    }
}
