'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'


import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TableContainer
} from '@mui/material'
import { email, object, minLength, string, pipe, nonEmpty, array } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import { getAllIndustries, getAllInterests, getAllOccupations, getAllUserTypes } from '@/actions/global-action'
import { createUser } from '@/actions/user-actions'

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), nonEmpty(), email()),
  password: pipe(string(), nonEmpty(), minLength(8)),
  firstName: pipe(string(), nonEmpty()),
  lastName: pipe(string(), nonEmpty()),
  cellphone: pipe(string(), nonEmpty()),
  interests: pipe(array(string()), nonEmpty()),
  industry: pipe(string(), nonEmpty()),
  occupation: pipe(string(), nonEmpty()),
  userType: pipe(string(), nonEmpty())
})

interface ISelects {
  id: string
  name: string
}

export default function Page() {

  //state
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [industries, setIndustries] = useState<ISelects[]>([])
  const [occupations, setOccupations] = useState<ISelects[]>([])
  const [interests, setInterests] = useState<ISelects[]>([])
  const [userTypes, setUserTypes] = useState<ISelects[]>([])
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
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      cellphone: '',
      interests: [],
      industry: '',
      occupation: '',
      userType: ''
    }
  })

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit = (value: any) => {
    createUser({
      email: value.email,
      password: value.password,
      firstName: value.firstName,
      lastName: value.lastName,
      cellphone: value.cellphone,
      interests: value.interests,
      industry: value.industry,
      occupation: value.occupation,
      userType: value.userType
    }).then(data => {
      if (data) {
        toast.success('User Created')
        router.push('/users')
        reset()
      }
    })
  }

  useEffect(() => {
    getAllIndustries().then(data => {
      if (data) {
        setIndustries(data)
      }
    })

    getAllOccupations().then(data => {
      if (data) {
        setOccupations(data)
      }
    })

    getAllInterests().then(data => {
      if (data) {
        setInterests(data.map((item: any) => ({ id: item.id, name: item.interest })) as ISelects[])
      }
    })

    getAllUserTypes().then(data => {
      if (data) {
        setUserTypes(data)
      }
    })
  }, [])

  return (
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
                          value={field.value} // Asegúrate de agregar esta línea para establecer el valor seleccionado correctamente
                          {...(errors.interests && { error: true })}
                        >
                          {interests.map(item => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.interests && <span>{errors.interests.message}</span>}
                        {/* Muestra el mensaje de error si existe */}
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

                <Grid item xs={12}>
                  <Controller
                    name='password'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <CustomTextField
                        {...field}
                        fullWidth
                        label='Password'
                        placeholder='············'
                        id='form-validation-scheme-password'
                        type={isPasswordShown ? 'text' : 'password'}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position='end'>
                              <IconButton
                                edge='end'
                                onClick={handleClickShowPassword}
                                onMouseDown={e => e.preventDefault()}
                                aria-label='toggle password visibility'
                              >
                                <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                        {...(errors.password && { error: true, helperText: errors.password.message })}
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
