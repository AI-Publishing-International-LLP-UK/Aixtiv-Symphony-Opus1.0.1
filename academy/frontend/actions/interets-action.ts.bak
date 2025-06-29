'use server'
import type { Interests } from '../prisma/prisma'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

//crud basic

export const createInterests = async (interest: string, category: string): Promise<Interests> => {
  try {
    return await prismaClient.interests.create({
      data: {
        interest,
        category
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to interests webinar')
  }
}

export const getAllInterests = async (): Promise<Interests[]> => {
  try {
    return await prismaClient.interests.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find interests')
  }
}

export const getInterestsById = async (id: string) => {
  try {
    return await prismaClient.interests.findUnique({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find interests')
  }
}

export const deleteInterests = async (id: string): Promise<Interests> => {
  try {
    return await prismaClient.interests.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete interests')
  }
}

export const updateInterests = async (id: string, data: Partial<Interests>): Promise<Interests> => {
  try {
    return await prismaClient.interests.update({
      where: { id },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update interests')
  }
}
