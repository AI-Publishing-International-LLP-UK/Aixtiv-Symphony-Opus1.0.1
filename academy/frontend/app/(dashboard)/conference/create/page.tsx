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
import { createConference } from '@/actions/conference-action'
import { getUserByType } from '@/actions/user-actions'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  startDateTime: pipe(string(), nonEmpty(), minLength(3)),
  endDateTime: pipe(string(), nonEmpty(), minLength(3)),
  speakerId: pipe(string(), nonEmpty(), minLength(3))
})

interface ISelects {
  id: string
  name: string
}

export default function Page() {
  //state
  const router = useRouter()
  const [speaker, setSpeaker] = useState<ISelects[]>([])

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
      startDateTime: '',
      endDateTime: '',
      speakerId: ''
    }
  })

  useEffect(() => {
    getUserByType('Speaker').then(response => {
      setSpeaker(response.map(item => ({ id: item.id, name: `${item.firstName} ${item.lastName}` })))
    })
  }, [])

  const onSubmit = async (value: any) => {
    try {
      const response = await createConference({
        name: value.name,
        description: value.description,
        startDateTime: new Date(value.startDateTime),
        endDateTime: new Date(value.endDateTime),
        speakerId: value.speakerId,
        date: new Date()
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
      {console.log(errors)}
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
                        fullWidth
                        label='Speaker'
                        placeholder=''
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
                    name='startDateTime'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Start Date Time'
                        placeholder=''
                        {...(errors.startDateTime && { error: true, helperText: errors.startDateTime.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='endDateTime'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='End Date Time'
                        placeholder=''
                        {...(errors.endDateTime && { error: true, helperText: errors.endDateTime.message })}
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
