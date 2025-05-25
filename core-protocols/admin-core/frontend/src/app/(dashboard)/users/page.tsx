'use client'
import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

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

import type { User } from '@prisma/client'

import tableStyles from '@core/styles/table.module.css'

import { getAllUsers } from '../../../actions/user-actions'
import Link from '@/components/Link'
import CustomTextField from '@/@core/components/mui/TextField'

export default function Page() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const router = useRouter()

  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    getAllUsers().then(users => {
      setUsers(users)
      setFilteredUsers(users)
    })
  }, [])

  useEffect(() => {
    if (filter === '') return setFilteredUsers(users)

    const newUsers = users.filter(user => {
      const firstNameMatches = user.firstName.toLowerCase().includes(filter.toLowerCase())
      const lastNameMatches = user.lastName.toLowerCase().includes(filter.toLowerCase())
      const emailMatches = user.email.toLowerCase().includes(filter.toLowerCase())

      return firstNameMatches || emailMatches || lastNameMatches
    })

    setFilteredUsers(newUsers)
  }, [filter, users])

  //function to view user

  return (
    <Card>
      <CardHeader>Users</CardHeader>
      <CardContent>
        {/* button to create user */}
        <div style={{ textAlign: 'right' }} className='mb-3'>
          <Button variant='contained' onClick={() => router.push('/users/create')}>
            Create User
          </Button>
        </div>
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
                <TableCell>Id</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Cellphone</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.cellphone}</TableCell>
                  <TableCell>
                    <Link href={`/users/edit/${user.id}`}>
                      <Button variant='contained' style={{ marginRight: '10px' }}>
                        Edit
                      </Button>
                    </Link>
                    <Button variant='contained' color='error' style={{ marginRight: '10px' }}>
                      Delete
                    </Button>
                    <Link href={`/users/view/${user.id}`}>
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
