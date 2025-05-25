'use server'
import type { ProductsVendor } from '@prisma/client'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateProductVendorDto {
  name: string
  description: string
}

export const createProductVendor = async (data: CreateProductVendorDto): Promise<ProductsVendor> => {
  try {
    const createdProductVendor = await prismaClient.productsVendor.create({
      data: {
        name: data.name,
        description: data.description
      }
    })

    return createdProductVendor
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create product vendor')
  }
}

export const getAllProductVendor = async (): Promise<ProductsVendor[]> => {
  try {
    const allProductVendors = await prismaClient.productsVendor.findMany()

    return allProductVendors
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find product vendors')
  }
}

export const getProductVendorById = async (id: string): Promise<ProductsVendor | null> => {
  try {
    const productVendor = await prismaClient.productsVendor.findUnique({
      where: { id }
    })

    return productVendor
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find product vendor')
  }
}

export const updateProductVendor = async (
  id: string,
  data: Partial<ProductsVendor>
): Promise<ProductsVendor | null> => {
  try {
    const updatedProductVendor = await prismaClient.productsVendor.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        updatedAt: new Date()
      }
    })

    return updatedProductVendor
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update product vendor')
  }
}

export const deleteProductVendor = async (id: string): Promise<void> => {
  try {
    await prismaClient.productsVendor.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete product vendor')
  }
}
