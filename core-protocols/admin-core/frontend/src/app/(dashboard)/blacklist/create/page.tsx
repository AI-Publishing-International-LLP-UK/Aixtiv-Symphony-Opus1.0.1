'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { Button, Card, CardContent, CardHeader, Grid, TableContainer } from '@mui/material'
import { object, minLength, string, pipe, nonEmpty, custom } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import { url, nameElement } from '../contstants'
import { createBlacklist } from '@/actions/blacklist-action'

type FormData = InferInput<typeof schema>

const isValidDomain = (input: unknown): input is string => {
  if (typeof input !== 'string') {
    return false
  }

  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  return domainRegex.test(input)
}

const schema = object({
  domain: pipe(string(), nonEmpty(), minLength(3), custom(isValidDomain, 'need to be a valid domain'))
})

export default function Page() {
  //state
  const router = useRouter()

  //hooks
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      domain: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await createBlacklist(value.domain)

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <ToastContainer />

      <Card>
        <CardHeader title={`Create ${nameElement}`} />
        <CardContent>
          <TableContainer>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <Controller
                    name='domain'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Domain'
                        placeholder=''
                        {...(errors.domain && { error: true, helperText: errors.domain.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} className='flex gap-4'>
                  <Button variant='contained' type='submit'>
                    Submit
                  </Button>
                  <Button variant='tonal' color='secondary' type='reset' onClick={() => reset()}>
                    Reset
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  )
}
