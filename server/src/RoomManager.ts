import { Room } from './Room';

export class RoomManager {
    public rooms: Map<string, Room> = new Map();

    createRoom(): Room {
        let code = this.generateCode();
        while (this.rooms.has(code)) {
            code = this.generateCode();
        }
        const room = new Room(code);
        this.rooms.set(code, room);
        console.log(`🏠 Room created: ${code}`);
        return room;
    }

    getRoom(code: string): Room | undefined {
        return this.rooms.get(code);
    }

    removeRoom(code: string) {
        this.rooms.delete(code);
        console.log(`🗑️ Room removed: ${code}`);
    }

    private generateCode(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 4; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
}
