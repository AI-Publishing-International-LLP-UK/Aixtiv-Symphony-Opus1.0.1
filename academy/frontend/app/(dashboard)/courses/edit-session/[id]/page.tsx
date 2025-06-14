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
import { url } from '../../contstants'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { getSessionById, updateSession } from '@/actions/session-action'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  startDate: pipe(string(), nonEmpty(), minLength(3)),
  endDate: pipe(string(), nonEmpty(), minLength(3)),
  thumbnail: pipe(string(), nonEmpty()),
  id: pipe(string(), nonEmpty())
})

interface Props {
  params: {
    id: string
  }
}

export default function Page({ params }: Props) {
  //state
  const router = useRouter()

  const { id } = params

  const [loading, setLoading] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  function changeLoading(loading: boolean) {
    setLoading(loading)
  }

  //hooks
  const {
    control,
    reset,
    setValue,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      thumbnail: '',
      id: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await updateSession(id, {
        id: value.id,
        name: value.name,
        description: value.description,
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
        thumbnail: value.thumbnail
      })

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getSessionById(id).then(resp => {
      if (resp) {
        setValue('name', resp.name)
        setValue('description', resp.description)
        setValue('startDate', new Date(resp.startDate).toISOString().slice(0, 16))
        setValue('endDate', new Date(resp.endDate).toISOString().slice(0, 16))
        setValue('thumbnail', resp.thumbnail)
        setValue('id', resp.id)
        setThumbnailUrl(resp.thumbnail)
      } else {
        router.push(`/${url}`)
      }
    })
  }, [id, router, setValue])

  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
  }

  return (
    <>
      {console.log(errors)}
      <ToastContainer />

      <Card>
        <CardHeader title={`Create Session`} />
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
                    name='startDate'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Start Date'
                        type='datetime-local'
                        placeholder=''
                        {...(errors.startDate && { error: true, helperText: errors.startDate.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='endDate'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='End Date'
                        type='datetime-local'
                        placeholder=''
                        {...(errors.endDate && { error: true, helperText: errors.endDate.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='thumbnail'
                    control={control}
                    rules={{ required: true }}
                    render={({}) => (
                      <FileUploaderRestrictions
                        setFile={handleThumbnail}
                        changeLoading={changeLoading}
                        loading={loading}
                        stringFile={thumbnailUrl}
                      />
                    )}
                    {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
                  />
                </Grid>
                <Grid item xs={12} className='flex gap-4'>
                  {loading ? (
                    <Button variant='tonal' color='primary' disabled>
                      Loading...
                    </Button>
                  ) : (
                    <Button variant='tonal' color='primary' type='submit'>
                      Create
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
