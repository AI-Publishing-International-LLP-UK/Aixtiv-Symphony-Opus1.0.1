'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent } from '@mui/material'

import DateComponent from '@/components/global/DateComponent'
import { getOrganizationById } from '@/actions/organization-action'

interface Props {
  params: {
    id: string
  }
}

// id: string;
// name: string;
// description: string | null;
// industryId: string | null;
// createdAt: Date;
// updatedAt: Date;

export default function Page({ params }: Props) {
  const { id } = params

  const [element, setElement] = useState<any | null>(null)

  useEffect(() => {
    if (id) {
      getOrganizationById(id).then(data => {
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
            <h1>Industry ID</h1>
            <p>{element.industryId}</p>
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
