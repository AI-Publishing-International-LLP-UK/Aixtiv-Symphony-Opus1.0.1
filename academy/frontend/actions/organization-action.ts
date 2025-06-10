'use server'
import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateOrganizationDto {
  name: string
  description: string
  industryId: string
}

export const createOrganization = async (data: CreateOrganizationDto): Promise<any> => {
  try {
    return await prismaClient.organization.create({
      data: {
        name: data.name,
        description: data.description,
        industry: {
          connect: { id: data.industryId }
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create organization')
  }
}

export const getAllOrganization = async () => {
  try {
    return await prismaClient.organization.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find organizations')
  }
}

export const getOrganizationById = async (id: string) => {
  try {
    return await prismaClient.organization.findUnique({ where: { id } })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find organization')
  }
}

export const updateOrganization = async (
  id: string,
  data: Partial<{
    id: string
    course: string
    startDate: Date
    endDate: Date
    createdAt: Date
    updatedAt: Date
  }>
) => {
  try {
    return await prismaClient.organization.update({
      where: { id },
      data
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update organization')
  }
}

export const deleteOrganization = async (id: string): Promise<void> => {
  try {
    await prismaClient.organization.delete({ where: { id } })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete organization')
  }
}
