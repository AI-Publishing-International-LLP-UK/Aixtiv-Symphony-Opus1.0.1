'use server'

import prisma from '@/prisma/prisma'

export const getAllCollaboration = async () => {
  try {
    return await prisma.collaboration.findMany({
      include: {
        User: {
          select: {
            email: true,
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
  } catch (err) {
    console.error(err)
    throw new Error('Failed to fetch all collaboration')
  }
}

export const getCollaborationById = async (id: string) => {
  try {
    return await prisma.collaboration.findUnique({
      where: { id: parseInt(id) },
      include: {
        User: {
          select: {
            email: true,
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
  } catch (err) {
    console.error(err)
    throw new Error('Failed to fetch collaboration by ID')
  }
}

export const deleteCollaboration = async (id: number) => {
  try {
    return await prisma.collaboration.delete({ where: { id } })
  } catch (err) {
    console.error(err)
    throw new Error('Failed to delete collaboration')
  }
}
