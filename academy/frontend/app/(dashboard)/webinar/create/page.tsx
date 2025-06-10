'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
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

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import { url, nameElement } from '../contstants'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { createWebinar } from '@/actions/webinar-action'
import { getUserByType } from '@/actions/user-actions'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  speakerId: pipe(string(), nonEmpty(), minLength(3)),
  thumbnail: pipe(string(), nonEmpty(), minLength(3)),
  startDate: pipe(string(), nonEmpty(), minLength(3)),
  endDate: pipe(string(), nonEmpty(), minLength(3))
})

interface ISelects {
  id: string
  name: string
}

export default function Page() {
  //state
  const router = useRouter()
  const [speaker, setSpeaker] = useState<ISelects[]>([])
  const [loading, setLoading] = useState(false)

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
      speakerId: '',
      thumbnail: '',
      startDate: '',
      endDate: ''
    }
  })

  useEffect(() => {
    getUserByType('Speaker').then(response => {
      setSpeaker(response.map(item => ({ id: item.id, name: `${item.firstName} ${item.lastName}` })))
    })
  }, [])

  const onSubmit = async (value: any) => {
    try {
      const response = await createWebinar({
        name: value.name,
        description: value.description,
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
        thumbnail: value.thumbnail,
        speakerId: value.speakerId
      })

      console.log('response:', response)

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
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

                {/* speaker */}

                <Grid item xs={12}>
                  <InputLabel id='speaker'>Speaker</InputLabel>
                  <Controller
                    name='speakerId'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        labelId='speaker'
                        fullWidth
                        {...(errors.speakerId && { error: true, helperText: errors.speakerId.message })}
                      >
                        {speaker.map(item => (
                          <MenuItem key={item.id} value={item.id}>
                            {item.name}
                          </MenuItem>
                        ))}
                      </Select>
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
                        {...(errors.startDate && { error: true, helperText: errors.startDate.message })}
                      />
                    )}
                  />
                </Grid>

                {/* enddate */}
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
                      />
                    )}
                    {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
                  />
                </Grid>
                <Grid item xs={12} className='flex gap-4'>
                  {loading ? (
                    <Button variant='contained' type='submit' disabled>
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
