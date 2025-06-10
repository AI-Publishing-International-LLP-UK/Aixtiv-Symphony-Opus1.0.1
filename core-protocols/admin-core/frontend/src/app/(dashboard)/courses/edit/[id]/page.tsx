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
import { object, minLength, string, pipe, nonEmpty, array } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import ComponentLoading from '@/components/global/LoadingComponent'
import { nameElement, url } from '../../contstants'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { getCourseById, updateCourse } from '@/actions/course-action'
import { getAllSkills } from '@/actions/skills-action'

type FormData = InferInput<typeof schema>

const schema = object({
  course: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  skillIds: pipe(array(string()), nonEmpty()),
  thumbnail: pipe(string(), nonEmpty(), minLength(3)),
  startDate: pipe(string(), nonEmpty(), minLength(3)),
  endDate: pipe(string(), nonEmpty(), minLength(3)),
  id: pipe(string(), nonEmpty(), minLength(3))
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
  const [upload, setUpload] = useState(false)
  const [skills, setSkills] = useState<ISelects[]>([])
  const [thumbnailUrl, setthumbnailUrl] = useState('')

  function changeLoading(loading: boolean) {
    setUpload(loading)
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
      course: '',
      startDate: '',
      description: '',
      thumbnail: '',
      endDate: '',
      skillIds: [],
      id: id
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await updateCourse(value.id, {
        course: value.course,
        startDate: new Date(value.startDate),
        endDate: new Date(value.endDate),
        description: value.description,
        thumbnail: value.thumbnail,
        skillIds: value.skillIds
      })

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getAllSkills().then(data => {
      setSkills(data)
    })

    getCourseById(id).then(data => {
      console.log(data)

      if (data) {
        setValue('course', data.name)
        setValue('description', data.description)
        setValue('thumbnail', data.thumbnail)
        setValue('startDate', data.startDate ? data.startDate.toISOString().split('T')[0] : '')
        setValue('endDate', data.endDate ? data.endDate.toISOString().split('T')[0] : '')

        setValue(
          'skillIds',
          data.skills.map(item => item.id)
        )
        setthumbnailUrl(data.thumbnail)
      }

      setLoading(false)
    })
  }, [id, setValue])

  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
  }

  return (
    <>
      {console.log(errors)}
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
                      name='course'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Course'
                          placeholder=''
                          {...(errors.course && { error: true, helperText: errors.course.message })}
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

                  {/* skills */}
                  <Grid item xs={12}>
                    <InputLabel id='skills'>Skills</InputLabel>
                    <Controller
                      name='skillIds'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <Select
                          {...field}
                          labelId='skills'
                          fullWidth
                          multiple
                          value={field.value}
                          onChange={e => {
                            field.onChange(e.target.value)
                          }}
                        >
                          {skills.map(skill => (
                            <MenuItem key={skill.id} value={skill.id}>
                              {skill.name}
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
                          placeholder=''
                          type='date'
                          {...(errors.startDate && { error: true, helperText: errors.startDate.message })}
                        />
                      )}
                    />

                    <Controller
                      name='endDate'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='End Date'
                          placeholder=''
                          type='date'
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
                          loading={upload}
                          changeLoading={changeLoading}
                          stringFile={thumbnailUrl}
                        />
                      )}
                      {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
                    />
                  </Grid>
                  <Grid item xs={12} className='flex gap-4'>
                    {upload ? (
                      <Button variant='tonal' type='submit' disabled>
                        Save
                      </Button>
                    ) : (
                      <Button variant='tonal' type='submit'>
                        Save
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
