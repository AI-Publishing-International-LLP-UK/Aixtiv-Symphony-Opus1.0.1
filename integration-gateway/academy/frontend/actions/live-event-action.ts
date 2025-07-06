'use server'

import prisma from '@/prisma/prisma'

export async function getAllLiveEvents() {
  return await prisma.liveEvent.findMany()
}

export async function createLiveEvent({
  url,
  title,
  description,
  backgroundLink,
  isLive = false,
  contentType
}: {
  url: string
  title: string
  description: string
  backgroundLink?: string
  isLive?: boolean
  contentType: string
}) {
  if (isLive) {
    // Unset any currently live event
    await prisma.liveEvent.updateMany({
      where: { isLive: true },
      data: { isLive: false }
    })
  }

  return await prisma.liveEvent.create({
    data: { url, title, description, backgroundLink, isLive, contentType }
  })
}

export async function updateLiveEvent({
  id,
  url,
  title,
  description,
  backgroundLink,
  isLive,
  contentType
}: {
  id: number
  url?: string
  title?: string
  description?: string
  backgroundLink?: string
  isLive?: boolean
  contentType?: string
}) {
  if (isLive) {
    // Unset any currently live event
    await prisma.liveEvent.updateMany({
      where: { isLive: true },
      data: { isLive: false }
    })
  }

  return await prisma.liveEvent.update({
    where: { id },
    data: {
      url,
      title,
      description,
      backgroundLink,
      isLive,
      contentType
    }
  })
}

export async function getLiveEventById(id: number) {
  return await prisma.liveEvent.findUnique({
    where: { id }
  })
}

export async function deleteLiveEvent(id: number) {
  return await prisma.liveEvent.delete({
    where: { id }
  })
}
