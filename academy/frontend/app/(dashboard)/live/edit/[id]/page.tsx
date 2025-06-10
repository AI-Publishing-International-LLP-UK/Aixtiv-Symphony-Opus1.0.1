'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TableContainer
} from '@mui/material'
import { object, minLength, string, pipe, nonEmpty } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import ComponentLoading from '@/components/global/LoadingComponent'
import { url } from '../../constatnts'
import { getLiveEventById, updateLiveEvent } from '@/actions/live-event-action'

type FormData = InferInput<typeof schema>

const schema = object({
  title: pipe(string(), nonEmpty(), minLength(3)),
  url: pipe(string(), nonEmpty(), minLength(3)),
  backgroundLink: pipe(string(), nonEmpty()),
  description: pipe(string(), nonEmpty(), minLength(3)),
  contentType: pipe(string(), nonEmpty())
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
      title: '',
      description: '',
      backgroundLink: '',
      url: '',
      contentType: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await updateLiveEvent({
        id: parseInt(id),
        backgroundLink: value.backgroundLink,
        title: value.title,
        url: value.url,
        description: value.description,
        contentType: value.contentType
      })

      if (response) {
        router.push(`${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getLiveEventById(parseInt(id)).then(data => {
      if (data) {
        setValue('backgroundLink', data.backgroundLink || '')
        setValue('title', data.title || '')
        setValue('url', data.url)
        setValue('description', data.description)
        setValue('contentType', data.contentType)

        setLoading(false)
      }
    })
  }, [id, setValue])

  return (
    <>
      <Card>
        <CardHeader title={`Edit Live Event`} />
        <CardContent>
          <TableContainer>
            <ComponentLoading loading={loading}>
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
                          placeholder=''
                          {...(errors.description && { error: true, helperText: errors.description.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='backgroundLink'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Background Link'
                          placeholder=''
                          {...(errors.backgroundLink && { error: true, helperText: errors.backgroundLink.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='contentType'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.contentType}>
                          <InputLabel>Content Type</InputLabel>
                          <Select {...field} label='Content Type' defaultValue=''>
                            <MenuItem value='image'>Image</MenuItem>
                            <MenuItem value='livestream'>Livestream</MenuItem>
                            <MenuItem value='video'>Video</MenuItem>
                          </Select>
                          {errors.contentType && <FormHelperText>{errors.contentType.message}</FormHelperText>}
                        </FormControl>
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
                          label='Redirect URL'
                          placeholder=''
                          {...(errors.url && { error: true, helperText: errors.url.message })}
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
