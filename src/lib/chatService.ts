import * as circleService from './circleService';
import { mockStorage } from './mockStorage';

const useFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: number;
}

export async function sendMessage(circleId: string, userId: string, displayName: string, text: string): Promise<void> {
  if (useFirebase) {
    await circleService.sendChatMessage(circleId, userId, displayName, text);
  } else {
    mockStorage.addChatMessage(circleId, userId, displayName, text);
  }
}

export function subscribeToChat(circleId: string, onMessages: (m: ChatMessage[]) => void): () => void {
  if (useFirebase) {
    return circleService.subscribeToChat(circleId, onMessages);
  }
  return mockStorage.subscribeToChat(circleId, onMessages);
}
