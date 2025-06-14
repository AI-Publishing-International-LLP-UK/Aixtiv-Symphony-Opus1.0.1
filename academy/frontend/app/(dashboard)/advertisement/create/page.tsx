'use client'

import React, { useState } from 'react'

import { useRouter } from 'next/navigation'

import { Button, Card, CardContent, CardHeader, Grid, TableContainer } from '@mui/material'
import { object, minLength, string, pipe, nonEmpty } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { createAdvertisement } from '../../../../actions/advertisement-action'

type FormData = InferInput<typeof schema>

const schema = object({
  title: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  backgroundImg: pipe(string(), nonEmpty()),
  url: pipe(string(), nonEmpty())
})

export default function Page() {
  //state
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function changeLoading(loading: boolean) {
    setLoading(loading)
  }

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
      title: '',
      description: '',
      backgroundImg: '',
      url: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await createAdvertisement(value)

      if (response) {
        router.push('/advertisement')
      }
    } catch (error) {
      console.error(error)
    }
  }

  //function to assign the value of the thumbnail
  const handleThumbnail = (url: string) => {
    setValue('backgroundImg', url)
  }

  return (
    <>
      <ToastContainer />

      <Card>
        <CardHeader title={'Create Advertisement'} />
        <CardContent>
          <TableContainer>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <Controller
                    name='title'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Title'
                        placeholder=''
                        {...(errors.title && { error: true, helperText: errors.title.message })}
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
                        placeholder='description'
                        {...(errors.description && { error: true, helperText: errors.description.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='url'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Redeem URL'
                        placeholder='url'
                        {...(errors.url && { error: true, helperText: errors.url.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='backgroundImg'
                    control={control}
                    rules={{ required: true }}
                    render={({}) => (
                      <FileUploaderRestrictions
                        setFile={handleThumbnail}
                        loading={loading}
                        changeLoading={changeLoading}
                      />
                    )}
                    {...(errors.backgroundImg && { error: true, helperText: errors.backgroundImg.message })}
                  />
                </Grid>

                <Grid item xs={12} className='flex gap-4'>
                  {loading ? (
                    <Button variant='tonal' color='primary' disabled>
                      Loading...
                    </Button>
                  ) : (
                    <Button variant='contained' type='submit'>
                      Submit
                    </Button>
                  )}
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
