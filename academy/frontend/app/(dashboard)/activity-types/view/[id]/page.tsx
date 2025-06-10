'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent } from '@mui/material'

import DateComponent from '@/components/global/DateComponent'

import { getActivityTypeById } from '@/actions/activity-types-action'

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
      getActivityTypeById(id).then(data => {
        if (data) setElement(data)
      })
    }
  }, [id])

  return (
    <Card>
      <CardContent>
        {element && (
          <div>
            <h1>ID</h1>
            <p>{element.id}</p>
            <h1>Type</h1>
            <p>{element.type}</p>
            <h1>Description</h1>
            <p>{element.description}</p>
            <h1>Created At</h1>
            <DateComponent date={element.createdAt} />
            <h1>Updated At</h1>
            <DateComponent date={element.updatedAt} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
