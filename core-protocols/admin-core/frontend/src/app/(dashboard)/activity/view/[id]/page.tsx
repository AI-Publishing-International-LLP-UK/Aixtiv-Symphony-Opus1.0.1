'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent } from '@mui/material'

import { getActivityById } from '@/actions/activities-action'

interface Props {
  params: {
    id: string
  }
}

export default function Page({ params }: Props) {
  const { id } = params

  const [element, setElement] = useState<any | null>(null)

  useEffect(() => {
    if (id) {
      getActivityById(id).then(data => {
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
            <h1>Name</h1>
            <p>{element.name}</p>
            <h1>Description</h1>
            <p>{element.description}</p>
            <h1>Type</h1>
            <p>{element.activityType?.type}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
