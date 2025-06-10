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
import ComponentLoading from '@/components/global/LoadingComponent'
import { nameElement, url } from '../../contstants'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { getWebinarById, updateWebinar } from '@/actions/webinar-action'
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
  const [speaker, setSpeaker] = useState<ISelects[]>([])
  const [uploading, setUploading] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')

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
      speakerId: '',
      thumbnail: '',
      startDate: '',
      endDate: ''
    }
  })

  const changeOnLoading = (loading: boolean) => {
    setUploading(loading)
  }

  const onSubmit = async (value: any) => {
    try {
      const response = await updateWebinar(value.id, value)

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getUserByType('Speaker').then(response => {
      setSpeaker(response.map(item => ({ id: item.id, name: `${item.firstName} ${item.lastName}` })))
    })

    getWebinarById(id).then(data => {
      if (data) {
        setValue('name', data.name)
        setValue('description', data.description)
        setValue('speakerId', data.speakerId)
        setValue('thumbnail', data.thumbnail!)
        setValue('startDate', new Date(data.startDate).toISOString().slice(0, 16))
        setValue('endDate', new Date(data.endDate).toISOString().slice(0, 16))
        setThumbnailUrl(data.thumbnail!)
      }

      setLoading(false)
    })
  }, [id, setValue])

  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
  }

  return (
    <>
      <ComponentLoading loading={loading}>
        <ToastContainer />

        <Card>
          <CardHeader title={`Edit ${nameElement}`} />
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
                          changeLoading={changeOnLoading}
                          loading={uploading}
                          stringFile={thumbnailUrl}
                        />
                      )}
                      {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
                    />
                  </Grid>
                  <Grid item xs={12} className='flex gap-4'>
                    {loading ? (
                      <Button variant='tonal' color='primary' type='submit' disabled>
                        Submit
                      </Button>
                    ) : (
                      <Button variant='tonal' color='primary' type='submit'>
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
      </ComponentLoading>
    </>
  )
}
