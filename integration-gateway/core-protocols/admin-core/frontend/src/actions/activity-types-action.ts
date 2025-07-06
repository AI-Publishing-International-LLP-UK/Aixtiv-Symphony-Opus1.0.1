'use server'
import type { ActivityType, ActivityTypeEnum } from '@prisma/client'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export const getAllActivityType = async (): Promise<ActivityType[]> => {
  try {
    return await prismaClient.activityType.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find activity type')
  }
}

export const createActivityType = async (description: string, type: ActivityTypeEnum) => {
  try {
    return await prismaClient.activityType.create({
      data: {
        description,
        type
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create activity type')
  }
}

export const getActivityTypeById = async (id: string) => {
  try {
    return await prismaClient.activityType.findUnique({
      where: {
        id
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find activity type')
  }
}

export const updateActivityType = async (id: string, data: Partial<ActivityType>) => {
  try {
    return await prismaClient.activityType.update({
      where: {
        id
      },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update activity type')
  }
}

export const deleteActivityType = async (id: string) => {
  try {
    return await prismaClient.activityType.delete({
      where: {
        id
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete activity type')
  }
}
