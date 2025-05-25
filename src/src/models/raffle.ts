import mongoose, { Document, Schema } from 'mongoose';

export interface IRaffle extends Document {
    raffleId: string;
    guildId: string;
    channelId: string;
    messageId?: string;
    ownerId: string;
    name: string;
    description: string;
    raffleEndTimestamp: number
    numberOfWinners: number;
    codeInstructions?: string;
    codes?: string[];
    unusedCodes?: string[];
    drawn: boolean;
}

const RaffleSchema: Schema = new Schema({
    raffleId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: false },
    ownerId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    raffleEndTimestamp: { type: Number, required: true },
    numberOfWinners: { type: Number, required: true },
    codeInstructions: { type: String },
    codes: { type: [String] },
    unusedCodes: { type: [String] },
    drawn: { type: Boolean, default: false },
});

export default mongoose.model<IRaffle>('Raffle', RaffleSchema);