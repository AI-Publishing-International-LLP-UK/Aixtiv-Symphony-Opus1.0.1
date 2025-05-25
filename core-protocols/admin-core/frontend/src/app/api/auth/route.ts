import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// import { cookies } from 'next/headers'

import { cookies } from 'next/headers'

import { validate } from './utils'

type ResponseData = {
  message: string
}

export async function GET() {
  const responseData: ResponseData = { message: 'hello' }

  return NextResponse.json(responseData)
}

export async function POST(req: NextRequest) {
  const data = await req.json()

  // mechanism to validate the userId and password
  const checkCredentials = await validate(data.username)
  let token

  //Hit the api and get the token from backend

  const response = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' // Set the header to indicate JSON format
    },
    body: JSON.stringify({
      email: data.username + '@coaching2100.com',
      password: data.password
    })
  })

  if (response.ok) {
    // Checks if the response status is in the 200 range
    const responseBody: { token: string } = await response.json() // Parse the JSON body

    token = responseBody.token //Getting the token from the response
  } else {
    console.error('Failed to log in:', response.statusText)
  }

  if (checkCredentials) {
    return NextResponse.json(
      { message: 'passed' },
      {
        status: 200,
        headers: {
          'Set-Cookie': `token=${token}; Path=/`
        }
      }
    )
  }

  return NextResponse.json(
    { message: 'failed' },
    {
      status: 401,
      headers: {
        'Set-Cookie': `session=${''}; Path=/`
      }
    }
  )
}

export async function DELETE() {
  cookies().delete('token')

  return NextResponse.json({ message: 'logged out' }, { status: 200 })
}
