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
import { getAllProductVendor } from '@/actions/products-vendor-action'
import { getAllProductCategory } from '@/actions/products-category-action'
import { getConferenceById, updateConference } from '@/actions/conference-action'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  vendorId: pipe(array(string()), nonEmpty()),
  categoryId: pipe(array(string()), nonEmpty()),
  url: pipe(string(), nonEmpty()),
  thumbnail: pipe(string(), nonEmpty())
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
  const [vendors, setVendors] = useState<ISelects[]>([])
  const [categories, setCategories] = useState<ISelects[]>([])
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
      vendorId: [],
      categoryId: [],
      url: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await updateConference(value.id, value)

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const changeLoading = (loading: boolean) => {
    setLoading(loading)
  }

  useEffect(() => {
    getAllProductVendor().then(data => {
      setVendors(data)
    })
    getAllProductCategory().then(data => {
      setCategories(data)
    })

    getConferenceById(id).then(data => {
      if (data) {
        setValue('name', data.name)
        setValue('description', data.description)
        setValue('url', data.url !== null ? data.url : '')
        setValue(
          'vendorId',
          data.vendor.map((item: any) => item.id)
        )
        setValue(
          'categoryId',
          data.category.map((item: any) => item.id)
        )
        setValue('thumbnail', data.thumbnail)
        setThumbnailUrl(data.thumbnail)
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

                  <Grid item xs={12}>
                    <Controller
                      name='vendorId'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <>
                          <InputLabel>Vendor</InputLabel>
                          <Select
                            {...field}
                            fullWidth
                            label='vendorid'
                            multiple
                            value={field.value} // Asegúrate de agregar esta línea para establecer el valor seleccionado correctamente
                            {...(errors.vendorId && { error: true })}
                          >
                            {vendors.map(item => (
                              <MenuItem key={item.id} value={item.id}>
                                {item.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.vendorId && <span>{errors.vendorId.message}</span>}
                          {/* Muestra el mensaje de error si existe */}
                        </>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='categoryId'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <>
                          <InputLabel>Category </InputLabel>
                          <Select
                            {...field}
                            fullWidth
                            label='categoryid'
                            multiple
                            value={field.value} // Asegúrate de agregar esta línea para establecer el valor seleccionado correctamente
                            {...(errors.categoryId && { error: true })}
                          >
                            {categories.map(item => (
                              <MenuItem key={item.id} value={item.id}>
                                {item.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.categoryId && <span>{errors.categoryId.message}</span>}
                          {/* Muestra el mensaje de error si existe */}
                        </>
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
                          label='Url'
                          placeholder=''
                          {...(errors.url && { error: true, helperText: errors.url.message })}
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
                          stringFile={thumbnailUrl}
                        />
                      )}
                      {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
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
      </ComponentLoading>
    </>
  )
}
