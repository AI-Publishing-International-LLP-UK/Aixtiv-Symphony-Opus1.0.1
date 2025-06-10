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
import { email, object, string, pipe, nonEmpty, array } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import { getAllIndustries, getAllInterests, getAllOccupations, getAllUserTypes } from '@/actions/global-action'
import { getUserById, manageApproveUser, updateUser } from '@/actions/user-actions'

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), nonEmpty(), email()),
  firstName: pipe(string(), nonEmpty()),
  lastName: pipe(string(), nonEmpty()),
  cellphone: string(),
  interests: array(string()),
  industry: string(),
  occupation: string(),
  userType: pipe(string(), nonEmpty())
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
  const [approved, setApprove] = useState(false)

  //state
  const [isLoading, setIsLoading] = useState(true)
  const [industries, setIndustries] = useState<ISelects[]>([])
  const [occupations, setOccupations] = useState<ISelects[]>([])
  const [interests, setInterests] = useState<ISelects[]>([])
  const [userTypes, setUserTypes] = useState<ISelects[]>([])
  const router = useRouter()

  const { id } = params

  //hooks
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      cellphone: '',
      interests: [],
      industry: '',
      occupation: '',
      userType: ''
    }
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [industriesData, occupationsData, interestsData, userTypesData] = await Promise.all([
          getAllIndustries(),
          getAllOccupations(),
          getAllInterests(),
          getAllUserTypes()
        ])

        if (industriesData) {
          setIndustries(industriesData)
        }

        if (occupationsData) {
          setOccupations(occupationsData)
        }

        if (interestsData) {
          setInterests(interestsData.map((item: any) => ({ id: item.id, name: item.interest })) as ISelects[])
        }

        if (userTypesData) {
          setUserTypes(userTypesData)
        }

        const userData = await getUserById(id)

        if (userData) {
          const approve = userData.verified || false

          setApprove(approve)
        }

        if (userData) {
          reset({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            cellphone: userData.cellphone || '',
            interests: userData.interests.map((item: any) => item.id),
            industry: userData.industry?.id || '',
            occupation: userData.occupation?.id || '',
            userType: userData.userType?.id || ''
          })
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [id, reset])

  const onSubmit = (value: any) => {
    updateUser({
      email: value.email,
      firstName: value.firstName,
      lastName: value.lastName,
      cellphone: value.cellphone,
      interests: value.interests,
      industry: value.industry,
      occupation: value.occupation,
      userType: value.userType,
      id: id
    }).then(data => {
      if (data) {
        toast.success('User Edited Successfully')
        router.push('/users')
        reset()
      }
    })
  }

  return (
    <>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <ToastContainer />

          <Card>
            <CardHeader title={'Create User'} />
            <CardContent>
              <TableContainer>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Grid container spacing={6}>
                    <Grid item xs={12}>
                      <Controller
                        name='firstName'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            label='First Name'
                            placeholder='John'
                            {...(errors.firstName && { error: true, helperText: errors.firstName.message })}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name='lastName'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            label='Last Name'
                            placeholder='Doe'
                            {...(errors.lastName && { error: true, helperText: errors.lastName.message })}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name='email'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            label='Email'
                            {...(errors.email && { error: true, helperText: errors.email.message })}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name='cellphone'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <CustomTextField
                            {...field}
                            fullWidth
                            label='Cellphone'
                            placeholder='+1234567890'
                            {...(errors.cellphone && { error: true, helperText: errors.cellphone.message })}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name='interests'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <>
                            <InputLabel>Interests</InputLabel>
                            <Select
                              {...field}
                              fullWidth
                              label='Interests'
                              multiple
                              value={field.value}
                              {...(errors.interests && { error: true })}
                            >
                              {interests.map(item => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </Select>
                            {errors.interests && <span>{errors.interests.message}</span>}
                          </>
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name='industry'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <>
                            <InputLabel>Industry</InputLabel>
                            <Select {...field} fullWidth label='Industry' {...(errors.industry && { error: true })}>
                              {industries.map(item => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </>
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name='occupation'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <>
                            <InputLabel>Occupation</InputLabel>
                            <Select {...field} fullWidth label='Occupation' {...(errors.occupation && { error: true })}>
                              {occupations.map(item => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </>
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Controller
                        name='userType'
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <>
                            <InputLabel>User Type</InputLabel>
                            <Select {...field} fullWidth label='User Type' {...(errors.userType && { error: true })}>
                              {userTypes.map(item => (
                                <MenuItem key={item.id} value={item.id}>
                                  {item.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </>
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
                      <Button
                        variant='outlined'
                        type='button'
                        onClick={async e => {
                          e.preventDefault()
                          await manageApproveUser({ id, approved: !approved })
                          setApprove(!approved)
                        }}
                      >
                        {approved ? 'Disapprove' : 'Approve'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
