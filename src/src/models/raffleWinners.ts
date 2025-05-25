import mongoose, { Document, Schema } from 'mongoose';

export interface IRaffleWinners extends Document {
    raffleId: string;
    userId: string;
    username: string;
    code?: string;
    claimed: boolean;
}

const RaffleWinnersSchema: Schema = new Schema({
    raffleId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    code: { type: String, required: false },
    claimed: { type: Boolean, default: false },
});

export default mongoose.model<IRaffleWinners>('RaffleWinners', RaffleWinnersSchema);