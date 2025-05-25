'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent } from '@mui/material'

import DateComponent from '@/components/global/DateComponent'

import { getAdvertisementById } from '@/actions/advertisement-action'

interface Props {
  params: {
    id: string
  }
}

// id: string;
// type: $Enums.ActivityTypeEnum;
// description: string;
// createdAt: Date;
// updatedAt: Date;

export default function Page({ params }: Props) {
  const { id } = params

  const [element, setElement] = useState<any | null>(null)

  useEffect(() => {
    if (id) {
      getAdvertisementById(parseInt(id)).then(data => {
        if (data) setElement(data)
      })
    }
  }, [id])

  return (
    <Card>
      <CardContent>
        {element && (
          <div>
            <h3>ID</h3>
            <p>{element.id}</p>
            <h3>Title</h3>
            <p>{element.title}</p>
            <h3>Description</h3>
            <p>{element.description}</p>
            <h3>URL</h3>
            <p>{element.url}</p>
            <h3>Updated At</h3>
            <DateComponent date={element.updatedAt} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
