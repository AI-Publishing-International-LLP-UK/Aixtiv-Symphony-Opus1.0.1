'use client'

import React from 'react'

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

// Define ActivityTypeEnum to match your Firestore schema
enum ActivityTypeEnum {
LIVE_WEBINARS = 'LIVE_WEBINARS',
CHAT_ROOMS = 'CHAT_ROOMS'
}

import CustomTextField from '@/@core/components/mui/TextField'
import { url, nameElement } from '../contstants'
import { createActivityType } from '@/actions/activity-types-action'

type FormData = InferInput<typeof schema>

const schema = object({
  description: pipe(string(), nonEmpty(), minLength(3)),
  type: pipe(string(), nonEmpty(), minLength(3))
})

const enumtry = ActivityTypeEnum

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
      description: '',
      type: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await createActivityType(value.description, value.type)

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
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

                {/* for each enum in enumtry */}

                <Grid item xs={12}>
                  <Controller
                    name='type'
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <>
                        <InputLabel>Vendor</InputLabel>
                        <Select
                          {...field}
                          fullWidth
                          label='type'
                          value={field.value}
                          {...(errors.type && { error: true })}
                        >
                          {Object.values(enumtry).map((item: string) => (
                            <MenuItem key={item} value={item}>
                              {item}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.type && <span>{errors.type.message}</span>}
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
                </Grid>
              </Grid>
            </form>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  )
}
