'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'

import tableStyles from '@core/styles/table.module.css'

import { getOrderById } from '@/actions/order-actions'

interface Props {
  params: {
    id: string
  }
}

export default function Page({ params }: Props) {
  const { id } = params

  const [order, setOrder] = useState<any | null>(null)

  useEffect(() => {
    if (id) {
      getOrderById(id).then(order => {
        if (order) setOrder(order)
      })
    }
  }, [id])

  return (
    <Card>
      <CardContent>
        {order && (
          <div>
            <h3>Order id</h3>
            <p>{order.orderId}</p>
            <h3>Order amount</h3>
            <p>$ {order.amount}</p>
            <h3>Order status</h3>
            <p>{order.paymentStatus}</p>
            <h3>First Name</h3>
            <p>{order.User.firstName}</p>
            <h3>Last Name</h3>
            <p>{order.User.lastName}</p>
            <h3>Email</h3>
            <p>{order.User.email}</p>
            <h3 className='mt-3'>Products</h3>
            <TableContainer>
              <Table className={tableStyles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>product Id</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.products.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.id}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>$ {product.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
