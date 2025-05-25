'use server'
import * as bcrypt from 'bcrypt'

import type { User } from '../prisma/prisma'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateUserDtO {
  email: string
  password: string
  firstName: string
  lastName: string
  cellphone: string
  interests: string[]
  industry: string
  occupation: string
  userType: string
}

export interface UpdateUserDtO extends CreateUserDtO {
  id: string
}

// CRUD básico con manejo de errores
export const createUser = async (user: CreateUserDtO) => {
  const hashedPassword = await bcrypt.hash(user.password, 10)

  try {
    return await prismaClient.user.create({
      data: {
        password: hashedPassword,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: {
          connect: { name: 'USER' }
        },
        userType: {
          connect: { id: user.userType }
        },
        interests: {
          connect: user.interests.map(interest => ({ id: interest }))
        },
        industry: {
          connect: { id: user.industry }
        },
        occupation: {
          connect: { id: user.occupation }
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create user')
  }
}

export const getAllUsers = async (): Promise<User[]> => {
  return prismaClient.user.findMany({
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

export const getUserById = async (id: string, userRole: string) => {
  const fields = userRole === 'ADMIN' ? {} : { select: { password: false } }

  return prismaClient.user.findUnique({
    where: { id },
    ...fields,
    include: {
      interests: true,
      industry: true,
      occupation: true,
      userType: true
    }
  })

  return prismaClient.user.findUnique({
    where: {
      id: id
    },
    include: {
      interests: true,
      industry: true,
      occupation: true,
      userType: true
    }
  })
}

export const updateUser = async (user: Partial<UpdateUserDtO>) => {
  try {
    return prismaClient.user.update({
      where: {
        id: user.id
      },

      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: {
          connect: { name: 'USER' }
        },
        userType: {
          connect: { id: user.userType }
        },
        interests: {
          set: user.interests?.map(interest => ({ id: interest }))
        },
        industry: {
          connect: { id: user.industry }
        },
        occupation: {
          connect: { id: user.occupation }
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update user')
  }
}

export const deleteUser = async (id: string) => {
  try {
    return prismaClient.user.delete({
      where: {
        id: id
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete user')
  }
}

export const getUserByType = async (type: string) => {
  return prismaClient.user.findMany({
    where: {
      userType: {
        name: type
      }
    }
  })
}

type ManageApproveUserType = {
  id: string
  approved: boolean
}

export const manageApproveUser = async (user: ManageApproveUserType) => {
  try {
    await prismaClient.user.update({
      where: {
        id: user.id
      },
      data: {
        verified: user.approved
      }
    })
  } catch (err) {
    console.log(err)
  }
}
