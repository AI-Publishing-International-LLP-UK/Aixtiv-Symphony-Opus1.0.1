'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent } from '@mui/material'

import DateComponent from '@/components/global/DateComponent'
import { getProductById } from '@/actions/product-action'

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
      getProductById(id).then(data => {
        if (data) setElement(data)
      })
    }
  }, [id])

  return (
    <Card>
      <CardContent>
        {element && (
          <div>
            <h3>Thumbnail</h3>
            {/* image */}
            <img src={element.thumbnail} alt={element.name} style={{ maxWidth: '150px' }} />
            <h3>ID</h3>
            <p>{element.id}</p>
            <h3>Name</h3>
            <p>{element.name}</p>
            <h3>Description</h3>
            <p>{element.description}</p>
            <h3>Price</h3>
            <p>{element.price}</p>

            {/* new fields */}
            <h3>What problem does it solve </h3>
            <p>{element.solveProblem}</p>
            <h3>How does it solve it</h3>
            <p>{element.solveHow}</p>
            <h3>Integration ability </h3>
            <p>{element.integrationAbility}</p>
            <h3>Market Reputation</h3>
            <p>{element.marketReputation}</p>
            <h3>Customer Service level</h3>
            <p>{element.customerServiceLevel}</p>

            <h3>URL</h3>
            <p>{element.url}</p>
            <h3>Created At</h3>
            <DateComponent date={element.createdAt} />
            <h3>Updated At</h3>
            <DateComponent date={element.updatedAt} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
