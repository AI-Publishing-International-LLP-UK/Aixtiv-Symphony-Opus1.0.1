'use server'
import type { UserType } from '../prisma/prisma'
import { PrismaClient } from '../prisma/prisma'

const prismaClient = new PrismaClient()

//crud basic

export const createUserType = async (name: string, description: string): Promise<UserType> => {
  try {
    return await prismaClient.userType.create({
      data: {
        name,
        description
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to usertype webinar')
  }
}

export const getAllUserType = async (): Promise<UserType[]> => {
  try {
    return await prismaClient.userType.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find usertype')
  }
}

export const getUserTypeById = async (id: string) => {
  try {
    return await prismaClient.userType.findUnique({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find usertype')
  }
}

export const updateUserType = async (id: string, data: Partial<UserType>): Promise<UserType> => {
  try {
    return await prismaClient.userType.update({
      where: { id },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update usertype')
  }
}

export const deleteUserType = async (id: string): Promise<UserType> => {
  try {
    return await prismaClient.userType.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete usertype')
  }
}
