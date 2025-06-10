'use client'
import { useEffect, useState } from 'react'

import { Card, CardContent, ListItemText } from '@mui/material'

import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'

import DateComponent from '@/components/global/DateComponent'

import { getCollaborationById } from '@/actions/collaboration-action'
import type { CollaborationDTO } from '../../collaboration.dto'

interface Props {
  params: {
    id: string
  }
}

export default function Page({ params }: Props) {
  const { id } = params

  const [element, setElement] = useState<CollaborationDTO | null>(null)

  useEffect(() => {
    if (id) {
      getCollaborationById(id).then(data => {
        if (data) setElement(data)
      })
    }
  }, [id])

  return (
    <Card>
      <CardContent>
        {element && (
          <div>
            <h4>ID</h4>
            <p>{element.id}</p>
            <h4>Name</h4>
            <p>{element.User.firstName + ' ' + element.User.lastName}</p>
            <List>
              <h4>Options</h4>
              {element.feedbackOptions.map(option => {
                return (
                  <ListItem key={option}>
                    <ListItemText>{option}</ListItemText>
                  </ListItem>
                )
              })}
            </List>
            <h4>Additional Feedback</h4>
            <p>{element.additionalFeedback}</p>
            <h4>User Friendly Rating</h4>
            <p>{element.userFriendlyRating}</p>
            <h4>Created At</h4>
            <DateComponent date={element.createdAt} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
