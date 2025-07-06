'use server'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateSessionDto {
  courseId: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  thumbnail: string
}

export interface AssignSessionActivityDto {
  sessionId: string
  activityId: string
  startDate: Date
  endDate: Date
}

export const createSession = async (
  data: CreateSessionDto
): Promise<{
  id: string
  courseId: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  thumbnail: string
  createdAt: Date
  updatedAt: Date
}> => {
  try {
    const createdSession = await prismaClient.session.create({
      data: {
        courseId: data.courseId,
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        thumbnail: data.thumbnail
      }
    })

    return createdSession
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create session')
  }
}

export const findAllSessions = async (): Promise<
  {
    id: string
    courseId: string
    name: string
    description: string
    startDate: Date
    endDate: Date
    thumbnail: string
    createdAt: Date
    updatedAt: Date
  }[]
> => {
  try {
    return await prismaClient.session.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find sessions')
  }
}

export const getSessionById = async (id: string) => {
  try {
    return await prismaClient.session.findUnique({ where: { id } })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find session')
  }
}

interface updateSession {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  thumbnail: string
}

export const updateSession = async (
  id: string,
  data: updateSession
): Promise<{
  id: string
  courseId: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  thumbnail: string
  createdAt: Date
  updatedAt: Date
}> => {
  try {
    return await prismaClient.session.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        thumbnail: data.thumbnail
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update session')
  }
}

export const deleteSession = async (id: string): Promise<void> => {
  try {
    await prismaClient.session.delete({ where: { id } })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete session')
  }
}

export const assignActivityToSession = async (data: AssignSessionActivityDto) => {
  try {
    await prismaClient.session.update({
      where: { id: data.sessionId },
      data: {
        activities: {
          create: {
            activityId: data.activityId,
            startDate: data.startDate,
            endDate: data.endDate
          }
        }
      }
    })

    return true
  } catch (error) {
    console.error(error)
    throw new Error('Failed to assign activity to session')
  }
}

export const removeActivityFromSession = async (sessionActivityId: string): Promise<boolean> => {
  try {
    await prismaClient.sessionActivity.delete({
      where: { id: sessionActivityId }
    })

    return true
  } catch (error) {
    console.error(error)
    throw new Error('Failed to remove activity from session')
  }
}
