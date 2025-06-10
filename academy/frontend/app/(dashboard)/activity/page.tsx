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

import tableStyles from '@core/styles/table.module.css'

import Link from '@/components/Link'
import { deleteActivity, getAllActivity } from '@/actions/activities-action'

export default function Page() {
  const [element, setElement] = useState<any[]>([])
  const router = useRouter()
  const nameElement = 'Activity'
  const url = nameElement.toLowerCase()

  useEffect(() => {
    getAllActivity().then(data => {
      setElement(data)
    })
  }, [])

  //function to delete activity
  const deleteActivityMethod = async (id: string) => {
    deleteActivity(id).then(() => {
      const newElement = element.filter(el => el.id !== id)

      setElement(newElement)
    })
  }

  return (
    <Card>
      <CardHeader title={nameElement} />
      <CardContent>
        {/* button to create user */}
        <div style={{ textAlign: 'right' }} className='mb-3'>
          <Button variant='contained' onClick={() => router.push(`/${url}/create`)}>
            Create {nameElement}
          </Button>
        </div>

        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Thumbnail</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {element.map(el => (
                <TableRow key={el.id}>
                  <TableCell>{el.id}</TableCell>
                  <TableCell>{el.name}</TableCell>
                  <TableCell>{el.description}</TableCell>
                  <TableCell>{el.activityType?.type}</TableCell>
                  <TableCell>
                    <img src={el.thumbnail} alt={el.name} width='50' height='50' />
                  </TableCell>
                  <TableCell>
                    <Link href={`/${url}/edit/${el.id}`}>
                      <Button variant='contained' style={{ marginRight: '10px' }}>
                        Edit
                      </Button>
                    </Link>
                    <Button
                      onClick={() => deleteActivityMethod(el.id)}
                      variant='contained'
                      color='error'
                      style={{ marginRight: '10px' }}
                    >
                      Delete
                    </Button>
                    <Link href={`/${url}/view/${el.id}`}>
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
