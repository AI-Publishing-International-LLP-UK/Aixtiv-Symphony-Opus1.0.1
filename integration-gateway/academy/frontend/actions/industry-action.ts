'use server'

import type { Industry } from '../prisma/prisma'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

//crud basic

export const createIndustry = async (name: string): Promise<Industry> => {
  try {
    return await prismaClient.industry.create({
      data: {
        name
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to industry webinar')
  }
}

export const getAllIndustry = async (): Promise<Industry[]> => {
  try {
    return await prismaClient.industry.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find industry')
  }
}

export const getIndustryById = async (id: string) => {
  try {
    return await prismaClient.industry.findUnique({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find industry')
  }
}

export const deleteIndustry = async (id: string): Promise<Industry> => {
  try {
    return await prismaClient.industry.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete industry')
  }
}

export const updateIndustry = async (id: string, data: Partial<Industry>): Promise<Industry> => {
  try {
    return await prismaClient.industry.update({
      where: { id },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update industry')
  }
}
