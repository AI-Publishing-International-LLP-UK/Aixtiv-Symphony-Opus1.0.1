'use server'
import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateProductCategoryDto {
  name: string
  description: string
}

export const createProductCategory = async (
  data: CreateProductCategoryDto
): Promise<{
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}> => {
  try {
    const createdProductCategory = await prismaClient.productsCategory.create({
      data: {
        name: data.name,
        description: data.description
      }
    })

    return createdProductCategory
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create product category')
  }
}

export const getAllProductCategory = async (): Promise<
  {
    id: string
    name: string
    description: string
    createdAt: Date
    updatedAt: Date
  }[]
> => {
  try {
    return await prismaClient.productsCategory.findMany()
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find product categories')
  }
}

export const getProductCategoryById = async (id: string) => {
  try {
    return await prismaClient.productsCategory.findUnique({ where: { id } })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find product category')
  }
}

export const updateProductCategory = async (
  id: string,
  data: Partial<{
    id: string
    name: string
    description: string
    createdAt: Date
    updatedAt: Date
  }>
): Promise<{
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}> => {
  try {
    return await prismaClient.productsCategory.update({ where: { id }, data })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update product category')
  }
}

export const deleteProductCategory = async (id: string): Promise<void> => {
  try {
    await prismaClient.productsCategory.delete({ where: { id } })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete product category')
  }
}
