'use server'
import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateProductDto {
  name: string
  description: string
  thumbnail: string
  url: string
  vendorId: string[]
  categoryId: string[]
  price: number
  solveProblem: string
  solveHow: string
  integrationAbility: string
  marketReputation: string
  customerServiceLevel: string
}

export const createProduct = async (data: CreateProductDto) => {
  try {
    const createdProduct = await prismaClient.products.create({
      data: {
        name: data.name,
        description: data.description,
        thumbnail: data.thumbnail,
        url: data.url,
        price: data.price,
        solveHow: data.solveHow,
        solveProblem: data.solveProblem,
        integrationAbility: data.integrationAbility,
        marketReputation: data.marketReputation,
        customerServiceLevel: data.customerServiceLevel,
        vendor: {
          connect: data.vendorId.map(id => ({ id }))
        },
        category: {
          connect: data.categoryId.map(id => ({ id }))
        }
      }
    })

    return createdProduct
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create product')
  }
}

export const getAllProducts = async () => {
  try {
    const products = await prismaClient.products.findMany()

    const productsWithStringDecimals = products.map(product => ({
      ...product,
      price: product.price.toString() // Convert Decimal to string
    }))

    return productsWithStringDecimals
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find products')
  }
}

export const getProductById = async (id: string) => {
  try {
    const product = await prismaClient.products.findUnique({
      where: { id },
      include: {
        vendor: true,
        category: true
      }
    })

    const productWithStringDecimal = {
      ...product,
      price: product?.price.toString()
    }

    return productWithStringDecimal
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find product')
  }
}

interface createProductDtO {
  name: string
  description: string
  thumbnail: string
  url: string
  vendor: string[]
  category: string[]
  id: string
  price: number
  solveProblem: string
  solveHow: string
  integrationAbility: string
  marketReputation: string
  customerServiceLevel: string
}

export const updateProduct = async (data: createProductDtO) => {
  try {
    const products = await prismaClient.products.findUnique({
      where: { id: data.id },
      include: {
        vendor: true,
        category: true
      }
    })

    // compare list of vendor and category

    const vendorDisconnect = products?.vendor.filter(vendor => !data.vendor.includes(vendor.id))

    const categoryDisconnect = products?.category.filter(category => !data.category.includes(category.id))

    if (vendorDisconnect) {
      await prismaClient.products.update({
        where: { id: data.id },
        data: {
          vendor: {
            disconnect: vendorDisconnect.map(vendor => ({ id: vendor.id }))
          }
        }
      })
    }

    if (categoryDisconnect) {
      await prismaClient.products.update({
        where: { id: data.id },
        data: {
          category: {
            disconnect: categoryDisconnect.map(category => ({ id: category.id }))
          }
        }
      })
    }

    return await prismaClient.products.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail: data.thumbnail,
        url: data.url,
        price: data.price,
        marketReputation: data.marketReputation,
        integrationAbility: data.integrationAbility,
        solveHow: data.solveHow,
        solveProblem: data.solveProblem,
        customerServiceLevel: data.customerServiceLevel,
        vendor: {
          connect: data.vendor.map(id => ({ id }))
        },
        category: {
          connect: data.category.map(id => ({ id }))
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update product')
  }
}

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await prismaClient.products.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete product')
  }
}
