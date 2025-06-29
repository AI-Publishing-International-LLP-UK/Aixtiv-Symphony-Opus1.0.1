export async function validate(username: string) {
return username == 'superadmin' || username == 'proark'
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    console.log('not valid token')

    return false
  }

  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/v1/auth/me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })

    const resData = await res.json()

    return resData.email === 'superadmin@coaching2100.com' || resData.email === 'proark@bcs2100.mx'
  } catch (err) {
    console.log(err)

    return false
  }
}
