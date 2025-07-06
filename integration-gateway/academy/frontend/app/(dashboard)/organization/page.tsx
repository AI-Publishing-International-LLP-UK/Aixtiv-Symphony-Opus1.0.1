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

// id: string;
// name: string;
// description: string | null;
// industryId: string | null;
// createdAt: Date;
// updatedAt: Date;

import Link from '@/components/Link'
import { nameElement, url } from './contstants'
import { deleteOrganization, getAllOrganization } from '@/actions/organization-action'
import DateComponent from '@/components/global/DateComponent'

export default function Page() {
  const [element, setElement] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    getAllOrganization().then(data => {
      setElement(data)
    })
  }, [])

  //function to delete activity
  const deleteMethod = async (id: string) => {
    deleteOrganization(id).then(() => {
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
                {/* <TableCell>Industry</TableCell> */}
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {element.map(el => (
                <TableRow key={el.id}>
                  <TableCell>{el.id}</TableCell>
                  <TableCell>{el.name}</TableCell>
                  <TableCell>{el.description}</TableCell>
                  {/* <TableCell>{el.industryId}</TableCell> */}
                  <TableCell>
                    <DateComponent date={new Date(el.createdAt)} />
                  </TableCell>
                  <TableCell>
                    <DateComponent date={new Date(el.updatedAt)} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/${url}/edit/${el.id}`}>
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
