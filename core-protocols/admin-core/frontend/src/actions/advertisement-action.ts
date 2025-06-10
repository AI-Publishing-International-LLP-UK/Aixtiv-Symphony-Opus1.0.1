'use server'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

type createAdvertisementDTO = {
  url: string
  backgroundImg: string
  title: string
  description: string
}

export const getAllAdvertisememts = async () => {
  try {
    const advertisements = await prisma.advertisement.findMany()

    return advertisements
  } catch (err) {
    throw new Error('Failed  to get advertisements')
  }
}

export const createAdvertisement = async (data: createAdvertisementDTO) => {
  try {
    const newAdvertisement = await prisma.advertisement.create({ data })

    return newAdvertisement
  } catch (err) {
    throw new Error('Failed to create advertisement')
  }
}

export const updateAdvertisement = async (id: number, data: Partial<typeof prisma.advertisement>) => {
  try {
    const updatedAdvertisement = await prisma.advertisement.update({
      where: { id },
      data
    })

    return updatedAdvertisement
  } catch (err) {
    throw new Error('Failed to update advertisement')
  }
}

export const getAdvertisementById = async (id: number) => {
  try {
    const advertisement = await prismaClient.advertisement.findUnique({
      where: {
        id
      }
    })

    return advertisement
  } catch (err) {
    throw new Error('Failed to get advertisement by id')
  }
}

export const deleteAdvertisement = async (id: number) => {
  try {
    const advertisements = await prismaClient.advertisement.delete({
      where: {
        id
      }
    })

    return advertisements
  } catch (err) {
    console.log('Error deletingadvertisement')
    throw new Error('Failed to delete advertisement')
  }
}

export const setAsHeader = async (id: number) => {
  await prisma.advertisement.updateMany({
    where: {
      isHeroSection: true
    },
    data: {
      isHeroSection: false
    }
  })

  await prisma.advertisement.update({
    where: {
      id
    },
    data: {
      isHeroSection: true
    }
  })
}

export const unsetHeader = async (id: number) => {
  await prisma.advertisement.update({
    where: {
      id
    },
    data: {
      isHeroSection: false
    }
  })
}

export const setAsFooter = async (id: number) => {
  await prisma.advertisement.updateMany({
    where: {
      isFooterBanner: true
    },
    data: {
      isFooterBanner: false
    }
  })

  await prisma.advertisement.update({
    where: {
      id
    },
    data: {
      isFooterBanner: true
    }
  })
}

export const unsetFooter = async (id: number) => {
  await prisma.advertisement.update({
    where: {
      id
    },
    data: {
      isFooterBanner: false
    }
  })
}
