'use server'
import type { Conference } from '@prisma/client'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateConferenceDto {
  name: string
  description: string
  startDateTime: Date
  endDateTime: Date
  date: Date
  speakerId: string
}

export interface UpdateConferenceDto {
  name?: string
  description?: string
  startDateTime?: Date
  endDateTime?: Date
  conferenceRoomId?: string
  date?: Date
  speakerId?: string
}

export const createConference = async (data: CreateConferenceDto): Promise<Conference> => {
  try {
    const room = await createRoomDail()

    console.log(room)

    return await prismaClient.conference.create({
      data: {
        name: data.name,
        description: data.description,
        startDateTime: data.startDateTime,
        endDateTime: data.endDateTime,
        conferenceRoom: room.id,
        conferenceUrlRoom: room.url,
        date: data.date,
        speaker: {
          connect: { id: data.speakerId }
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create conference')
  }
}

export const getAllConferences = async (): Promise<Conference[]> => {
  try {
    return await prismaClient.conference.findMany({
      include: { speaker: true, attendeesAsAttendee: true }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find conferences')
  }
}

export const getConferenceById = async (id: string): Promise<any> => {
  try {
    return await prismaClient.conference.findUnique({
      where: { id },
      include: { speaker: true, attendeesAsAttendee: true }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find conference')
  }
}

export const updateConference = async (id: string, data: UpdateConferenceDto): Promise<Conference> => {
  try {
    return await prismaClient.conference.update({
      where: { id },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update conference')
  }
}

export const deleteConference = async (id: string): Promise<void> => {
  try {
    await prismaClient.conference.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete conference')
  }
}

export const createRoomDail = async () => {
  const roomProperties = {
    privacy: 'private',
    properties: {
      eject_at_room_exp: true,
      start_audio_off: true,
      start_video_off: true,
      enable_recording: 'cloud',
      enable_transcription_storage: true,
      auto_transcription_settings: {
        language: 'es',
        model: 'nova-2'
      },
      recordings_bucket: {
        bucket_name: process.env.BUCKET_AWS_NAME,
        bucket_region: process.env.REGION_AWS,
        assume_role_arn: process.env.DAYLY_AWS_ARN,
        allow_api_access: false
      },
      transcription_bucket: {
        bucket_name: process.env.BUCKET_AWS_NAME,
        bucket_region: process.env.REGION_AWS,
        assume_role_arn: process.env.DAYLY_AWS_ARN,
        allow_api_access: false
      }
    }
  }

  console.log('Room properties:', roomProperties)

  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.DAILY_API_KEY}`
    },
    body: JSON.stringify(roomProperties)
  })

  if (!response.ok) {
    console.log(response.text())
    throw new Error(`Error creating Daily.co room: ${response.statusText}`)
  }

  const room = await response.json()

  return room
}
