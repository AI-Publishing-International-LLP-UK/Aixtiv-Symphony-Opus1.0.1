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

import { deleteLiveEvent, getAllLiveEvents, updateLiveEvent } from '@/actions/live-event-action'

import tableStyles from '@core/styles/table.module.css'

import Link from '@/components/Link'

import { url } from './constatnts'

type LiveEvent = {
  id: number
  url: string
  title: string
  description: string
  backgroundLink: string | null
  isLive: boolean
  createdAt: Date
  updatedAt: Date
}

const ComponentName = () => {
  const [data, setData] = useState<LiveEvent[]>()
  const router = useRouter()

  // Fetch data from API
  useEffect(() => {
    getAllLiveEvents().then(res => setData(res))
  }, [])

  const filter = (id: number) => {
    const newData = data?.filter(element => element.id !== id)

    setData(newData)
  }

  return (
    <Card>
      <CardHeader title={'Live Events'} />
      <CardContent>
        {/* button to create user */}
        <div style={{ textAlign: 'right' }} className='mb-3'>
          <Button variant='contained' onClick={() => router.push(`${url}/create`)}>
            Create {`Live Event`}
          </Button>
        </div>

        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Background Link</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.map(el => (
                <TableRow key={el.id}>
                  <TableCell>{el.id}</TableCell>
                  <TableCell>{el.title}</TableCell>
                  <TableCell>{el.description}</TableCell>
                  <TableCell>{el.url}</TableCell>
                  <TableCell>{el.backgroundLink}</TableCell>
                  <TableCell>
                    <Link href={`${url}/edit/${el.id}`}>
                      <Button variant='contained' style={{ marginRight: '10px' }}>
                        Edit
                      </Button>
                    </Link>
                    <Button
                      onClick={() => {
                        deleteLiveEvent(el.id)
                        filter(el.id)
                      }}
                      variant='contained'
                      color='error'
                      style={{ marginRight: '10px' }}
                    >
                      Delete
                    </Button>
                    <Link href={`${url}/view/${el.id}`}>
                      <Button variant='contained' color='success'>
                        View
                      </Button>
                    </Link>
                    <MakeLiveButton id={el.id} isLive={el.isLive} />
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

export default ComponentName

const MakeLiveButton = ({ id, isLive }: { id: number; isLive: boolean }) => {
  const [state, setState] = useState(isLive)

  const handleClick = async () => {
    setState(prev => !prev)
    await updateLiveEvent({ id, isLive: !state })
  }

  return (
    <Button variant='contained' color='info' style={{ marginLeft: '10px' }} onClick={handleClick}>
      {`${state ? 'Remove' : 'Make'} Live`}
    </Button>
  )
}
