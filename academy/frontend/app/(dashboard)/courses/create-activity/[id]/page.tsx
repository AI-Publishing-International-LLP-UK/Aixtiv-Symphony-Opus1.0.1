'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { Button, Card, CardContent, CardHeader, Grid, MenuItem, Select, TableContainer } from '@mui/material'
import { object, minLength, string, pipe, nonEmpty, optional } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Define ActivityTypeEnum to match your Firestore schema
enum ActivityTypeEnum {
LIVE_WEBINARS = 'LIVE_WEBINARS',
CHAT_ROOMS = 'CHAT_ROOMS'
}

import CustomTextField from '@/@core/components/mui/TextField'
import { url } from '../../contstants'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { CreateAndAssignActivityToSession, GetAllActivitiesTypes } from '@/actions/activities-action'
import { getSessionById } from '@/actions/session-action'
import { getAllConferences } from '@/actions/conference-action'
import { getAllWebinar } from '@/actions/webinar-action'

type FormData = InferInput<typeof schema>

const schema = object({
  sessionId: pipe(string(), nonEmpty(), minLength(3)),
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  thumbnail: pipe(string(), nonEmpty()),
  typeId: pipe(string(), nonEmpty(), minLength(3)),
  startDate: pipe(string(), nonEmpty(), minLength(3)),
  endDate: pipe(string(), nonEmpty(), minLength(3)),
  webinarId: optional(pipe(string(), minLength(3))),
  conferenceId: optional(pipe(string(), minLength(3)))
})

interface Props {
  params: {
    id: string
  }
}

interface ISelect {
  id: string
  type: ActivityTypeEnum
  description: string
}

interface ISelectConferenceWebinar {
  id: string
  name: string
}

export default function Page({ params }: Props) {
  //state
  const router = useRouter()
  const [types, setTypes] = useState<ISelect[]>([])
  const [loading, setLoading] = useState(false)
  const [typeSelected, setTypeSelected] = useState<number>(0)
  const [listOfConferences, setListOfConferences] = useState<ISelectConferenceWebinar[]>([])
  const [listOfWebinars, setListOfWebinars] = useState<ISelectConferenceWebinar[]>([])

  function changeLoading(loading: boolean) {
    setLoading(loading)
  }

  const { id } = params

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
      sessionId: '',
      name: '',
      description: '',
      thumbnail: '',
      typeId: '',
      startDate: '',
      endDate: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      console.log(value)

      const response = await CreateAndAssignActivityToSession({
        sessionId: id,
        name: value.name,
        description: value.description,
        thumbnail: value.thumbnail,
        typeId: value.typeId,
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
        webinarId: value.webinarId,
        conferenceId: value.conferenceId
      })

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const showWebinarOrConferenceInput = (id: string) => {
    const type = types.find(item => item.id === id)

    if (type) {
      if (type.type === ActivityTypeEnum.LIVE_WEBINARS) {
        setTypeSelected(1)
      } else if (type.type === ActivityTypeEnum.CHAT_ROOMS) {
        setTypeSelected(2)
      } else {
        setTypeSelected(0)
      }
    } else {
      setTypeSelected(0)
    }
  }

  useEffect(() => {
    GetAllActivitiesTypes().then(res => {
      setTypes(res.map(item => ({ id: item.id, type: item.type, description: item.description })))
    })

    getAllConferences().then(res => {
      setListOfConferences(res.map(item => ({ id: item.id, name: item.name })))
    })

    getAllWebinar().then(res => {
      setListOfWebinars(res.map(item => ({ id: item.id, name: item.name })))
    })

    getSessionById(id).then(resp => {
      if (resp) {
        setValue('sessionId', resp.id)
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
        <CardHeader title={`Create Activity`} />
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

                {/* <Grid item xs={12}>
                  <Controller
                    name='typeId'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Type'
                        select
                        onChange={e => {
                          console.log(e.target.value) // Logs the selected value
                          showWebinarOrConferenceInput(e.target.value)
                        }}
                        SelectProps={{
                          native: true
                        }}
                        {...(errors.typeId && { error: true, helperText: errors.typeId.message })}
                      >
                        <option value='' />
                        {types.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.type}
                          </option>
                        ))}
                      </CustomTextField>
                    )}
                  />
                </Grid> */}

                <Grid item xs={12}>
                  <Controller
                    name='typeId'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <Select
                        {...field}
                        fullWidth
                        label='Type'
                        onChange={e => {
                          field.onChange(e)
                          showWebinarOrConferenceInput(e.target.value)
                        }}
                        {...(errors.typeId && { error: true, helperText: errors.typeId.message })}
                      >
                        {types.map(item => (
                          <MenuItem key={item.id} value={item.id}>
                            {item.type}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </Grid>

                {typeSelected === 1 && (
                  <Grid item xs={12}>
                    <Controller
                      name='webinarId'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Webinar'
                          select
                          SelectProps={{
                            native: true
                          }}
                          {...(errors.typeId && { error: true, helperText: errors.typeId.message })}
                        >
                          <option value='' />
                          {listOfWebinars.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </CustomTextField>
                      )}
                    />
                  </Grid>
                )}

                {typeSelected === 2 && (
                  <Grid item xs={12}>
                    <Controller
                      name='conferenceId'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Conference'
                          select
                          SelectProps={{
                            native: true
                          }}
                          {...(errors.typeId && { error: true, helperText: errors.typeId.message })}
                        >
                          <option value='' />
                          {listOfConferences.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </CustomTextField>
                      )}
                    />
                  </Grid>
                )}

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
                      />
                    )}
                    {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
                  />
                </Grid>
                <Grid item xs={12} className='flex gap-4'>
                  {loading ? (
                    <Button variant='contained' type='submit' disabled>
                      Submit
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
