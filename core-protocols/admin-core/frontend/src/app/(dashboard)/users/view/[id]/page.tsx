'use client'
import { useEffect, useState } from 'react'


import { Card, CardContent } from '@mui/material'
import { JsonToTable } from 'react-json-to-table'

import { getUserById } from '@/actions/user-actions'

interface Props {
  params: {
    id: string
  }
}

export default function Page({ params }: Props) {
  const { id } = params

  const [user, setUser] = useState<any | null>(null)

  useEffect(() => {
    if (id) {
      getUserById(id).then(user => {
        if (user) setUser(user)
      })
    }
  }, [id])

  return (
    <Card>
      <CardContent>
        {user && (
          <div>
            <h3>ID</h3>
            <p>{user.id}</p>
            <h3>First Name</h3>
            <p>{user.firstName}</p>
            <h3>Last Name</h3>
            <p>{user.lastName}</p>
            <h3>Email</h3>
            <p>{user.email}</p>
            <h3>Cellphone</h3>
            <p>{user.cellphone ? user.cellphone : 'null'}</p>
            <h3>Interests</h3>
            <ul>{user.interests?.map((e: any) => <li key={e.id}>{e.interest}</li>)}</ul>
            <h3>Data</h3>
            <div>
              <span>FormId: </span>
              <span>{user.formId ? user.formId : 'null'}</span>
            </div>
            <div>
              <span>ResponseId: </span>
              <span>{user.responseId ? user.responseId : 'null'}</span>
            </div>
            <div>
              <h4>Form:</h4>
              {/* <pre>{JSON.stringify(user.formData, null, 2)}</pre> */}
              <JsonToTable json={user.formData}></JsonToTable>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
