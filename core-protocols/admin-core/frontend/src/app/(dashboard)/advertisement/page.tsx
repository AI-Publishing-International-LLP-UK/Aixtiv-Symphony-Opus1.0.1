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
import DateComponent from '@/components/global/DateComponent'
import { deleteAdvertisement, getAllAdvertisememts } from '@/actions/advertisement-action'
import { URL } from './constants'

export default function Page() {
  const [element, setElement] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    getAllAdvertisememts().then(data => {
      setElement(data)
    })
  }, [])

  //function to delete advertisement
  const deleteMethod = async (id: string) => {
    const ID = parseInt(id, 10)

    deleteAdvertisement(ID).then(() => {
      const newElement = element.filter(el => el.id !== id)

      setElement(newElement)
    })
  }

  return (
    <Card>
      <CardHeader title={'Advertisements'} />
      <CardContent>
        {/* button to create advertisement */}
        <div style={{ textAlign: 'right' }} className='mb-3'>
          <Button variant='contained' onClick={() => router.push(`${URL}/create`)}>
            Create Advertisement
          </Button>
        </div>

        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Background</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {element.map(el => (
                <TableRow key={el.id}>
                  <TableCell>{el.title}</TableCell>
                  <TableCell>{el.backgroundImg}</TableCell>
                  <TableCell>{el.url}</TableCell>
                  <TableCell>{el.description}</TableCell>
                  <TableCell>
                    <DateComponent date={new Date(el.updatedAt)} />
                  </TableCell>
                  <TableCell>
                    <Link href={`${URL}/edit/${el.id}`}>
                      <Button variant='contained' style={{ marginRight: '10px' }}>
                        Edit
                      </Button>
                    </Link>
                    <Button
                      onClick={() => deleteMethod(el.id)}
                      variant='contained'
                      color='error'
                      style={{ marginRight: '10px' }}
                    >
                      Delete
                    </Button>
                    <Link href={`${URL}/view/${el.id}`}>
                      <Button variant='contained' color='success' style={{ marginRight: '10px' }}>
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
