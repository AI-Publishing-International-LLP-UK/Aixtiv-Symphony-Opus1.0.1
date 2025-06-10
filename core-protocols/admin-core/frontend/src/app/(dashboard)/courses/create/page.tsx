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
import { url, nameElement } from '../contstants'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { createCourse } from '@/actions/course-action'
import { getAllSkills } from '@/actions/skills-action'

type FormData = InferInput<typeof schema>

const schema = object({
  course: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  skillIds: pipe(array(string()), nonEmpty()),
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
  const [skills, setSkills] = useState<ISelects[]>([])
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
      course: '',
      startDate: '',
      description: '',
      thumbnail: '',
      endDate: '',
      skillIds: []
    }
  })

  useEffect(() => {
    getAllSkills().then(data => {
      setSkills(data)
    })
  }, [])

  const onSubmit = async (value: any) => {
    try {
      const response = await createCourse({
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

  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
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
                        loading={loading}
                        changeLoading={changeLoading}
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
