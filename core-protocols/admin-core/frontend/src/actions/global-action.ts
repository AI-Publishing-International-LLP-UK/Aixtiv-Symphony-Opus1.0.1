'use server'
import prisma from '@/prisma/prisma'

const prismaClient = prisma

//function to get all intersts

export const getAllInterests = async () => {
  try {
    const interests = await prismaClient.interests.findMany()

    return interests
  } catch (error) {
    console.error(error)
  }
}

export const getAllOccupations = async () => {
  try {
    const occupations = await prismaClient.occupation.findMany()

    return occupations
  } catch (error) {
    console.error(error)
  }
}

export const getAllIndustries = async () => {
  try {
    const industries = await prismaClient.industry.findMany()

    return industries
  } catch (error) {
    console.error(error)
  }
}

export const getAllUserTypes = async () => {
  try {
    const userTypes = await prismaClient.userType.findMany()

    return userTypes
  } catch (error) {
    console.error(error)
  }
}
