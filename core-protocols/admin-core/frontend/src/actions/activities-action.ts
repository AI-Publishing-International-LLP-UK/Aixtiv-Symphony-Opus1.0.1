'use server'
import type { Activity } from '@prisma/client'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateActivityDto {
  name: string
  description: string
  typeId: string
  thumbnail: string
}

export const createActivity = async (data: CreateActivityDto) => {
  try {
    return await prismaClient.activity.create({
      data: {
        name: data.name,
        description: data.description,
        typeId: data.typeId,
        thumbnail: data.thumbnail
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create activity')
  }
}

export const getAllActivity = async (): Promise<Activity[]> => {
  try {
    return await prismaClient.activity.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find activities')
  }
}

export const getActivityById = async (id: string) => {
  try {
    return await prismaClient.activity.findUnique({
      where: {
        id
      },
      include: {
        activityType: true
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find activity')
  }
}

export const updateActivity = async (id: string, data: Partial<CreateActivityDto>) => {
  try {
    return await prismaClient.activity.update({
      where: {
        id
      },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update activity')
  }
}

export const deleteActivity = async (id: string): Promise<void> => {
  try {
    await prismaClient.activity.delete({
      where: {
        id
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete activity')
  }
}

export const GetAllActivitiesTypes = async () => {
  try {
    return await prismaClient.activityType.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find activity types')
  }
}

interface testing {
  sessionId: string
  name: string
  description: string
  thumbnail: string
  typeId: string
  startDate: Date
  endDate: Date
  webinarId?: string
  conferenceId?: string
}

export const CreateAndAssignActivityToSession = async (data: testing) => {
  try {
    const activityData: any = {
      name: data.name,
      description: data.description,
      typeId: data.typeId,
      thumbnail: data.thumbnail,
      sessionActivities: {
        create: {
          session: {
            connect: {
              id: data.sessionId
            }
          },
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate)
        }
      }
    }

    if (data.webinarId) {
      activityData.webinars = {
        connect: {
          id: data.webinarId
        }
      }
    }

    if (data.conferenceId) {
      activityData.conferences = {
        connect: {
          id: data.conferenceId
        }
      }
    }

    return await prismaClient.activity.create({
      data: activityData
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to assign activity to session')
  }
}
