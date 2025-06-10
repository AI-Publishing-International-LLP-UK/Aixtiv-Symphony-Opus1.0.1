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
import { object, minLength, string, pipe, nonEmpty, array, number, minValue } from 'valibot'
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
import { getProductById, updateProduct } from '@/actions/product-action'

type FormData = InferInput<typeof schema>

const schema = object({
  name: pipe(string(), nonEmpty(), minLength(3)),
  description: pipe(string(), nonEmpty(), minLength(3)),
  vendorId: pipe(array(string()), nonEmpty()),
  categoryId: pipe(array(string()), nonEmpty()),
  url: pipe(string(), nonEmpty()),
  thumbnail: pipe(string(), nonEmpty()),
  file: pipe(string(), nonEmpty()),

  // id: pipe(string(), nonEmpty()),
  price: pipe(number(), minValue(0)),
  solveProblem: string(),
  solveHow: string(),
  integrationAbility: string(),
  marketReputation: string(),
  customerServiceLevel: string()
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
  const [uploading, setUploading] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  const changeLoading = (loading: boolean) => {
    setUploading(loading)
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
      vendorId: [],
      categoryId: [],
      url: '',
      price: 10,
      customerServiceLevel: '',
      integrationAbility: '',
      marketReputation: '',
      solveProblem: '',
      solveHow: ''
    }
  })

  const onSubmit = async (value: any) => {
    try {
      const response = await updateProduct({
        id: id,
        name: value.name,
        description: value.description,
        vendor: value.vendorId,
        category: value.categoryId,
        url: value.url,
        thumbnail: value.thumbnail,
        price: Number(value.price),
        solveHow: value.solveHow,
        solveProblem: value.solveProblem,
        marketReputation: value.marketReputation,
        integrationAbility: value.integrationAbility,
        customerServiceLevel: value.customerServiceLevel
      })

      if (response) {
        router.push(`/${url}`)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    setLoading(true)
    getAllProductVendor().then(data => {
      setVendors(data)
    })
    getAllProductCategory().then(data => {
      setCategories(data)
    })

    getProductById(id).then(data => {
      if (data) {
        setValue('name', data.name ? data.name : '')
        setValue('description', data.description ? data.description : '')
        setValue('price', Number(data.price))
        setValue('url', data.url ? data.url : '')
        setValue('vendorId', data.vendor ? data.vendor.map((item: any) => item.id) : [])
        setValue('integrationAbility', data.integrationAbility ? data.integrationAbility : '')
        setValue('customerServiceLevel', data.customerServiceLevel ? data.customerServiceLevel : '')
        setValue('solveHow', data.solveHow ? data.solveHow : '')
        setValue('solveProblem', data.solveProblem ? data.solveProblem : '')
        setValue('marketReputation', data.marketReputation ? data.marketReputation : '')
        setValue('categoryId', data.category ? data.category.map((item: any) => item.id) : [])
        setValue('thumbnail', data.thumbnail ? data.thumbnail : '')
        setValue('file', data.url ? data.url : '')

        // setValue('id', data.id)
        setThumbnailUrl(data.thumbnail ? data.thumbnail : '')
      }
    })
    setLoading(false)
  }, [id, setValue])

  const handleThumbnail = (url: string) => {
    setValue('thumbnail', url)
  }

  const handleFile = (url: string) => {
    setValue('file', url)
    setValue('url', url)
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
                      name='price'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          type='number'
                          label='Price'
                          placeholder=''
                          onChange={e => field.onChange(+e.target.value)}
                          {...(errors.price && { error: true, helperText: errors.price.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='solveProblem'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='What problem does it solve'
                          placeholder=''
                          {...(errors.solveProblem && { error: true, helperText: errors.solveProblem.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='solveHow'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='How does it solve it '
                          placeholder=''
                          {...(errors.solveHow && { error: true, helperText: errors.solveHow.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='integrationAbility'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Integration Ability'
                          placeholder=''
                          {...(errors.integrationAbility && {
                            error: true,
                            helperText: errors.integrationAbility.message
                          })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='marketReputation'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Market Reputation'
                          placeholder=''
                          {...(errors.marketReputation && { error: true, helperText: errors.marketReputation.message })}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name='customerServiceLevel'
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <CustomTextField
                          {...field}
                          fullWidth
                          label='Customer Service Level'
                          placeholder=''
                          {...(errors.customerServiceLevel && {
                            error: true,
                            helperText: errors.customerServiceLevel.message
                          })}
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
                      name='thumbnail'
                      control={control}
                      rules={{ required: true }}
                      render={({}) => (
                        <FileUploaderRestrictions
                          setFile={handleThumbnail}
                          changeLoading={changeLoading}
                          loading={uploading}
                          stringFile={thumbnailUrl}
                        />
                      )}
                      {...(errors.thumbnail && { error: true, helperText: errors.thumbnail.message })}
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
                      name='file'
                      control={control}
                      rules={{ required: true }}
                      render={({}) => (
                        <FileUploaderRestrictions
                          isPdf={true}
                          setFile={handleFile}
                          loading={loading}
                          changeLoading={changeLoading}
                        />
                      )}
                      {...(errors.file && { error: true, helperText: errors.file.message })}
                    />
                  </Grid>

                  <Grid item xs={12} className='flex gap-4'>
                    {loading ? (
                      <Button variant='tonal' color='secondary' type='submit' disabled>
                        Loading...
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
