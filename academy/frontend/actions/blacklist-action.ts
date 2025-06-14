'use server'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

//crud basic

export const getAllBlacklist = async () => {
  try {
    return await prismaClient.blackListEmail.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find blacklist')
  }
}

export const getBlacklistById = async (id: string) => {
  try {
    return await prismaClient.blackListEmail.findUnique({
      where: {
        id
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find blacklist')
  }
}

export const createBlacklist = async (domain: string) => {
  try {
    return await prismaClient.blackListEmail.create({
      data: {
        domain
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create blacklist')
  }
}

export const deleteBlacklist = async (id: string) => {
  try {
    return await prismaClient.blackListEmail.delete({
      where: {
        id
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete blacklist')
  }
}

export const updateBlacklist = async (id: string, domain: string) => {
  try {
    return await prismaClient.blackListEmail.update({
      where: {
        id
      },
      data: {
        domain
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update blacklist')
  }
}

export const findBlacklistByDomain = async (domain: string) => {
  try {
    return await prismaClient.blackListEmail.findFirst({
      where: {
        domain
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find blacklist')
  }
}
