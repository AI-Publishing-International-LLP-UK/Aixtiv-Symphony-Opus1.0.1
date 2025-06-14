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
import ComponentLoading from '@/components/global/LoadingComponent'
import { nameElement, url } from '../../contstants'
import { getProductVendorById, updateProductVendor } from '@/actions/products-vendor-action'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  id: pipe(string(), nonEmpty(), minLength(3))
})

interface PageProps {
  params: {
    id: string
  }
}

export default function Page({ params }: PageProps) {
  //state
  const router = useRouter()
  const { id } = params

  const [loading, setLoading] = useState(true)

  //hooks
  const {
    control,
    reset,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      id: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await updateProductVendor(value.id, value)

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getProductVendorById(id).then(data => {
      if (data) {
        setValue('name', data.name || '')
        setValue('description', data.description || '')
        setValue('id', data.id)

        setLoading(false)
      }
    })
  }, [id, setValue])

  return (
    <>
      <ToastContainer />

      <Card>
        <CardHeader title={`Edit ${nameElement}`} />
        <CardContent>
          <TableContainer>
            <ComponentLoading loading={loading}>
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
            </ComponentLoading>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  )
}
