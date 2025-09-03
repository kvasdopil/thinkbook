import type { MessageWithId } from '../hooks/useEditableChat';

interface CodeCell {
  id: string;
  code: string;
  output: string[];
  error: string | null;
  lastExecuted?: string;
  createdByMessageId?: string;
  createdByToolCallId?: string;
  createdAt?: string;
}

export interface MessageWithCells {
  message: MessageWithId;
  cellsCreatedByThisMessage: CodeCell[];
}

export interface OrganizedContent {
  orphanCells: CodeCell[]; // Cells without corresponding messages
  messagesWithCells: MessageWithCells[];
}

/**
 * Organizes messages and cells so that cells appear after the messages that created them
 *
 * @param messages Array of chat messages
 * @param cells Array of code cells
 * @returns Organized structure with cells positioned after their creating messages
 */
export function organizeMessagesAndCells(
  messages: MessageWithId[],
  cells: CodeCell[],
): OrganizedContent {
  // Create a map of messageId -> cells created by that message
  const cellsByMessageId = new Map<string, CodeCell[]>();
  const orphanCells: CodeCell[] = [];

  for (const cell of cells) {
    let messageFound = false;

    // First try to match by tool call ID (for AI-created cells)
    if (cell.createdByToolCallId) {
      for (const message of messages) {
        // Check if this message has tool calls
        const originalMessage = message.originalMessage as
          | { parts?: unknown[] }
          | undefined;
        const toolParts =
          originalMessage?.parts?.filter(
            (part: unknown) =>
              (part as { toolCallId?: string })?.toolCallId ===
              cell.createdByToolCallId,
          ) || [];

        if (toolParts.length > 0) {
          if (!cellsByMessageId.has(message.id)) {
            cellsByMessageId.set(message.id, []);
          }
          cellsByMessageId.get(message.id)!.push(cell);
          messageFound = true;
          break;
        }
      }
    }

    // Fall back to message ID matching (for manually created cells)
    if (!messageFound && cell.createdByMessageId) {
      const messageExists = messages.some(
        (msg) => msg.id === cell.createdByMessageId,
      );

      if (messageExists) {
        if (!cellsByMessageId.has(cell.createdByMessageId)) {
          cellsByMessageId.set(cell.createdByMessageId, []);
        }
        cellsByMessageId.get(cell.createdByMessageId)!.push(cell);
        messageFound = true;
      }
    }

    // If no message found, treat as orphan
    if (!messageFound) {
      orphanCells.push(cell);
    }
  }

  // Sort cells within each message by creation time
  for (const cellsArray of cellsByMessageId.values()) {
    cellsArray.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  }

  // Sort orphan cells by creation time
  orphanCells.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  // Create the organized structure
  const messagesWithCells: MessageWithCells[] = messages.map((message) => ({
    message,
    cellsCreatedByThisMessage: cellsByMessageId.get(message.id) || [],
  }));

  return {
    orphanCells,
    messagesWithCells,
  };
}
