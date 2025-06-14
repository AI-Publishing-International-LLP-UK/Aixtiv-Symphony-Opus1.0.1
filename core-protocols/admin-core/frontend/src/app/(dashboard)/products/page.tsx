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
import { nameElement, url } from './contstants'
import { deleteProduct, getAllProducts } from '@/actions/product-action'

export default function Page() {
  const [element, setElement] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    getAllProducts().then(data => {
      setElement(data)
    })
  }, [])

  //function to delete activity
  const deleteMethod = async (id: string) => {
    deleteProduct(id).then(() => {
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
                <TableCell>Thumbnail</TableCell>
                <TableCell>Name</TableCell>
                {/* <TableCell>Description</TableCell> */}
                {/* <TableCell>Industry</TableCell> */}
                {/* <TableCell>Created At</TableCell> */}
                <TableCell>Price</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {element.map(el => (
                <TableRow key={el.id}>
                  <TableCell>
                    <img src={el.thumbnail} alt='thumbnail' style={{ maxWidth: '80px', maxHeight: '80px' }} />
                  </TableCell>
                  <TableCell>{el.name}</TableCell>
                  {/* <TableCell>{el.description}</TableCell> */}
                  {/* <TableCell>{el.industryId}</TableCell> */}
                  {/* <TableCell><DateComponent date={new Date(el.creatAt)} /></TableCell> */}
                  <TableCell>$ {el.price}</TableCell>
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
