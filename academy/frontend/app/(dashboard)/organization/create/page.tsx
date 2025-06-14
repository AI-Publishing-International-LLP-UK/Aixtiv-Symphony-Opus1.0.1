'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { Button, Card, CardContent, CardHeader, Grid, TableContainer } from '@mui/material'
import { object, minLength, string, pipe, nonEmpty } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import { url, nameElement } from '../contstants'
import { createOrganization } from '@/actions/organization-action'
import { getAllIndustries } from '@/actions/global-action'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  industryId: pipe(string(), nonEmpty(), minLength(3))
})

interface ISelects {
  id: string
  name: string
}

export default function Page() {
  //state
  const router = useRouter()
  const [industry, setIndustry] = useState<ISelects[]>([])

  //hooks
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      industryId: ''
    }
  })

  useEffect(() => {
    getAllIndustries().then(data => {
      if (data) {
        setIndustry(data)
      }
    })
  }, [])

  const onSubmit = async (value: any) => {
    try {
      const response = await createOrganization({
        name: value.name,
        description: value.description,
        industryId: value.industryId
      })

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
                    name='name'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Name'
                        placeholder=''
                        {...(errors.name && { error: true, helperText: errors.name.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='description'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Description'
                        placeholder=''
                        {...(errors.description && { error: true, helperText: errors.description.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='industryId'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Industry'
                        select
                        SelectProps={{
                          native: true
                        }}
                        {...(errors.industryId && { error: true, helperText: errors.industryId.message })}
                      >
                        <option value='' />
                        {industry.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </CustomTextField>
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
