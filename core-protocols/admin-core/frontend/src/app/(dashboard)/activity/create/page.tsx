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
import { createActivity, GetAllActivitiesTypes } from '@/actions/activities-action'
import FileUploaderRestrictions from '@/components/UploadComponent'
import type { ISelects } from '@/types/ISeLectTypes'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  typeId: pipe(string(), nonEmpty()),
  thumbnail: pipe(string(), nonEmpty())
})

export default function Page() {
  //state
  const [typesActivities, settypesActivities] = useState<ISelects[]>([])
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
      name: '',
      description: '',
      typeId: '',
      thumbnail: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await createActivity(value)

      if (response) {
        router.push('/activity')
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    GetAllActivitiesTypes().then(data => {
      settypesActivities(data)
    })
  }, [])

  //function to assign the value of the thumbnail
  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
  }

  return (
    <>
      <ToastContainer />

      <Card>
        <CardHeader title={'Create Activity'} />
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
                        placeholder='description'
                        {...(errors.description && { error: true, helperText: errors.description.message })}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name='typeId'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <>
                        <InputLabel>Type</InputLabel>
                        <Select
                          {...field}
                          fullWidth
                          label='typeId'
                          value={field.value}
                          {...(errors.typeId && { error: true })}
                        >
                          {typesActivities.map(item => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.type}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.typeId && <span>{errors.typeId.message}</span>}
                        {/* Muestra el mensaje de error si existe */}
                      </>
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
                        loading={loading}
                        changeLoading={changeLoading}
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
