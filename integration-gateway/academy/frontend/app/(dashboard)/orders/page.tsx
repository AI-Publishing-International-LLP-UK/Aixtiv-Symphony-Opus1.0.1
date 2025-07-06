'use client'
import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'

import type { Order } from '@prisma/client'

import tableStyles from '@core/styles/table.module.css'

import { getAllOrders } from '@/actions/order-actions'

import Link from '@/components/Link'
import CustomTextField from '@/@core/components/mui/TextField'

export default function Page() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])

  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    getAllOrders().then(orders => {
      setOrders(orders)
      setFilteredOrders(orders)
    })
  }, [])

  useEffect(() => {
    if (filter === '') return setFilteredOrders(orders)

    const newOrders = orders.filter(order => {
      const orderIdMatches = order.orderId.toLowerCase().includes(filter.toLowerCase())
      const userIdMatches = order.userId.toLowerCase().includes(filter.toLowerCase())

      return orderIdMatches || userIdMatches
    })

    setFilteredOrders(newOrders)
  }, [filter, orders])

  //function to view user

  return (
    <Card>
      <CardHeader>Users</CardHeader>
      <CardContent>
        <div className='mb-3'>
          <CustomTextField
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder='search'
            fullWidth
            label='Search'
            className='mb-3'
          />
          <Button variant='contained' onClick={() => setFilter('')}>
            clear
          </Button>
        </div>
        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell>order Id</TableCell>
                <TableCell>user Id</TableCell>
                <TableCell>status</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>updated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map(order => (
                <TableRow key={order.orderId}>
                  <TableCell>{order.orderId}</TableCell>
                  <TableCell>{order.userId}</TableCell>
                  <TableCell>{order.paymentStatus}</TableCell>
                  <TableCell>$ {Number(order.amount)}</TableCell>
                  <TableCell>{new Date(order.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link href={`/orders/view/${order.orderId}`}>
                      <Button variant='contained' color='success'>
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}
