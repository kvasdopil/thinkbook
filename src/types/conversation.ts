import { CellData } from './cell'
import { Message } from 'ai/react'

// Unified conversation item that can be either a message or a cell
export type ConversationItem =
  | {
      type: 'message'
      data: Message
      timestamp: number
    }
  | { type: 'cell'; data: CellData; timestamp: number }

// Helper function to sort conversation items chronologically
export function sortConversationItems(
  items: ConversationItem[]
): ConversationItem[] {
  return [...items].sort((a, b) => a.timestamp - b.timestamp)
}

// Helper function to get the last message ID from conversation items
export function getLastMessageId(items: ConversationItem[]): string | null {
  const sortedItems = sortConversationItems(items)
  for (let i = sortedItems.length - 1; i >= 0; i--) {
    if (sortedItems[i].type === 'message') {
      return (sortedItems[i].data as Message).id
    }
  }
  return null
}
