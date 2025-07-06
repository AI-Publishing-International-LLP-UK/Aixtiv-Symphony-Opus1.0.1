'use client'

import React from 'react'

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

import CustomTextField from '@/@core/components/mui/TextField'
import { url } from '../constatnts'
import { createLiveEvent } from '@/actions/live-event-action'

type FormData = InferInput<typeof schema>

const schema = object({
  title: pipe(string(), nonEmpty(), minLength(3)),
  url: pipe(string(), nonEmpty(), minLength(3)),
  backgroundLink: pipe(string(), nonEmpty()),
  description: pipe(string(), nonEmpty(), minLength(3)),
  contentType: pipe(string(), nonEmpty())
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
      title: '',
      description: '',
      backgroundLink: '',
      url: '',
      contentType: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await createLiveEvent(value)

      if (response) {
        router.push(`${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={`Create Live Event`} />
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
          </TableContainer>
        </CardContent>
      </Card>
    </>
  )
}
