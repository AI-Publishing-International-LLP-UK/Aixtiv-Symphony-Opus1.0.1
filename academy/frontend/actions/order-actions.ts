'use server'

import type { Order } from '../prisma/prisma'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export const getAllOrders = async (): Promise<Order[]> => {
  return prismaClient.order.findMany({
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

export const getOrderById = async (id: string): Promise<Order | null> => {
  return prismaClient.order.findUnique({
    where: {
      orderId: id
    },
    include: {
      User: true
    }
  })
}
