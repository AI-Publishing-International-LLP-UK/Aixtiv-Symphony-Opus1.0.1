'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent } from '@mui/material'

import DateComponent from '@/components/global/DateComponent'

import { getInterestsById } from '@/actions/interets-action'

interface Props {
  params: {
    id: string
  }
}

// id: string;
// category: string;
// interest: string;
// createdAt: Date;
// updatedAt: Date;

export default function Page({ params }: Props) {
  const { id } = params

  const [element, setElement] = useState<any | null>(null)

  useEffect(() => {
    if (id) {
      getInterestsById(id).then(data => {
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
            <h1>Category</h1>
            <p>{element.category}</p>
            <h1>Interest</h1>
            <p>{element.interest}</p>
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
