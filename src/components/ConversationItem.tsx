'use client'

import React from 'react'
import { ConversationItem as ConversationItemType } from '@/types/conversation'
import { CellData, CellOperations } from '@/types/cell'
import { Message } from 'ai/react'
import Cell from './Cell'
import MessageItem from './MessageItem'

interface ConversationItemProps {
  item: ConversationItemType
  cellOperations?: CellOperations
  isWorkerReady?: boolean
  isStopping?: boolean
  sharedArrayBufferSupported?: boolean
}

export default function ConversationItem({
  item,
  cellOperations,
  isWorkerReady,
  isStopping,
  sharedArrayBufferSupported,
}: ConversationItemProps) {
  if (item.type === 'message') {
    const message = item.data as Message
    return <MessageItem message={message} />
  } else if (item.type === 'cell') {
    const cell = item.data as CellData

    // Cell operations are required for cell items
    if (!cellOperations) {
      console.error('Cell operations are required for cell items')
      return null
    }

    return (
      <Cell
        cell={cell}
        operations={cellOperations}
        isWorkerReady={isWorkerReady || false}
        isStopping={isStopping || false}
        sharedArrayBufferSupported={sharedArrayBufferSupported || false}
      />
    )
  }

  return null
}
