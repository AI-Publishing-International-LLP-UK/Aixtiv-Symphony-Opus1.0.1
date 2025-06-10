'use client'

import React, { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { Button, Card, CardContent, CardHeader, Grid, TableContainer, FormControlLabel, Checkbox } from '@mui/material'

import { object, minLength, string, pipe, nonEmpty, boolean } from 'valibot'
import type { InferInput } from 'valibot'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { Controller, useForm } from 'react-hook-form'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import CustomTextField from '@/@core/components/mui/TextField'
import ComponentLoading from '@/components/global/LoadingComponent'
import { getAdvertisementById, updateAdvertisement } from '@/actions/advertisement-action'
import FileUploaderRestrictions from '@/components/UploadComponent'
import { URL } from '../../constants'

type FormData = InferInput<typeof schema>

const schema = object({
  description: pipe(string(), nonEmpty(), minLength(3)),
  title: pipe(string(), nonEmpty(), minLength(3)),
  url: pipe(string(), nonEmpty()),
  backgroundImg: pipe(string(), nonEmpty()),
  isFooterBanner: boolean(),
  isHeroSection: boolean(),
  isPrimary: boolean(),
  isSecondary: boolean()
})

interface PageProps {
  params: {
    id: string
  }
}

export default function Page({ params }: PageProps) {
  const router = useRouter()
  const { id } = params
  const [loading, setLoading] = useState(true)

  // State management for checkbox values
  const [isFooterBanner, setIsFooterBanner] = useState(false)
  const [isHeroSection, setIsHeroSection] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)
  const [isSecondary, setIsSecondary] = useState(false)

  const {
    control,
    reset,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      description: '',
      title: '',
      url: '',
      backgroundImg: '',
      isFooterBanner: false,
      isHeroSection: false,
      isPrimary: false,
      isSecondary: false
    }
  })

  const handleThumbnail = (url: string) => {
    setValue('backgroundImg', url)
  }

  const onSubmit = async (value: any) => {
    const updatedValue = {
      ...value,
      isFooterBanner,
      isHeroSection,
      isPrimary,
      isSecondary
    }

    try {
      const response = await updateAdvertisement(parseInt(id), updatedValue)

      if (response) {
        router.push(`${URL}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    getAdvertisementById(parseInt(id)).then(data => {
      if (data) {
        setValue('title', data.title || '')
        setValue('url', data.url || '')
        setValue('backgroundImg', data.backgroundImg || '')
        setValue('description', data.description || '')
        setIsFooterBanner(data.isFooterBanner || false)
        setIsHeroSection(data.isHeroSection || false)
        setIsPrimary(data.isPrimary || false)
        setIsSecondary(data.isSecondary || false)

        setLoading(false)
      }
    })
  }, [id, setValue])

  return (
    <>
      <ToastContainer />
      <Card>
        <CardHeader title={`Edit Advertisement`} />
        <CardContent>
          <TableContainer>
            <ComponentLoading loading={loading}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={6}>
                  <Grid item xs={12}>
                    <Controller
                      name='title'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Title'
                          placeholder=''
                          {...(errors.title && { error: true, helperText: errors.title.message })}
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

                  <Grid item xs={12}>
                    <Controller
                      name='url'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Redeem URL'
                          placeholder=''
                          {...(errors.url && { error: true, helperText: errors.url.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='backgroundImg'
                      control={control}
                      rules={{ required: true }}
                      render={({}) => (
                        <FileUploaderRestrictions
                          changeLoading={() => {}}
                          setFile={handleThumbnail}
                          loading={loading}
                        />
                      )}
                      {...(errors.backgroundImg && { error: true, helperText: errors.backgroundImg.message })}
                    />
                  </Grid>

                  {/* Checkboxes for Advertisement Types */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox checked={isFooterBanner} onChange={e => setIsFooterBanner(e.target.checked)} />
                      }
                      label='Set as Footer Banner'
                    />
                    <FormControlLabel
                      control={<Checkbox checked={isHeroSection} onChange={e => setIsHeroSection(e.target.checked)} />}
                      label='Set as Hero Section'
                    />
                    <FormControlLabel
                      control={<Checkbox checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />}
                      label='Set as Primary Advertisement'
                    />
                    <FormControlLabel
                      control={<Checkbox checked={isSecondary} onChange={e => setIsSecondary(e.target.checked)} />}
                      label='Set as Secondary Advertisement'
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
            </ComponentLoading>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  )
}
