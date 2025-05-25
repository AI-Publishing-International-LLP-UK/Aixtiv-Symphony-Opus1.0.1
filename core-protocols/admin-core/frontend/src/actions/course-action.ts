'use server'
import type { Course } from '@prisma/client'

import prisma from '@/prisma/prisma'

const prismaClient = prisma

export interface CreateCourseDto {
  course: string
  startDate: Date
  endDate: Date
  description: string
  thumbnail: string
  skillIds: string[]
}

export interface CreateCourseCompleteDto {
  course: string
  startDate: Date
  endDate: Date
  description: string
  thumbnail: string
  skillIds: string[]
  sessions: {
    name: string
    description: string
    startDate: Date
    endDate: Date
    thumbnail: string
    activities: {
      activityId: string
      startDate: Date
      endDate: Date
    }[]
  }[]
}

export const findStudentInCourse = async (id: string, studentId: string) => {
  try {
    return await prismaClient.userCourse.findFirst({
      where: {
        courseId: id,
        userId: studentId
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find student in course')
  }
}

export const createCourse = async (data: CreateCourseDto): Promise<Course> => {
  try {
    return await prismaClient.course.create({
      data: {
        name: data.course,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        thumbnail: data.thumbnail,
        skills: {
          connect: data.skillIds.map(skillId => ({ id: skillId }))
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create course')
  }
}

export const getAllCourses = async (): Promise<Course[]> => {
  try {
    return await prismaClient.course.findMany({
      include: {
        skills: true,
        sessions: {
          include: {
            activities: {
              include: {
                activity: true
              }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find courses')
  }
}

export const getCourseById = async (id: string) => {
  try {
    return await prismaClient.course.findUnique({
      where: { id },
      include: {
        skills: true
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to find course')
  }
}

export const updateCourse = async (id: string, data: CreateCourseDto): Promise<Course> => {
  try {
    return await prismaClient.course.update({
      where: { id },
      data: {
        name: data.course,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        thumbnail: data.thumbnail,
        skills: {
          set: data.skillIds.map(skillId => ({ id: skillId }))
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to update course')
  }
}

export const deleteCourse = async (id: string): Promise<void> => {
  try {
    // Buscar todas las sesiones del curso que se desea eliminar
    const sessions = await prismaClient.session.findMany({
      where: {
        courseId: id
      }
    })

    // Obtener los IDs de todas las sesiones del curso
    const sessionIds = sessions.map(session => session.id)

    // Eliminar todas las relaciones SessionActivity asociadas a las sesiones del curso
    await prismaClient.sessionActivity.deleteMany({
      where: {
        sessionId: {
          in: sessionIds
        }
      }
    })

    // Eliminar las sesiones del curso
    await prismaClient.session.deleteMany({
      where: {
        courseId: id
      }
    })

    // Eliminar todas las relaciones UserCourse asociadas al curso
    await prismaClient.userCourse.deleteMany({
      where: {
        courseId: id
      }
    })

    // Finalmente, eliminar el curso
    await prismaClient.course.delete({
      where: { id }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to delete course')
  }
}

export const addStudentToCourse = async (id: string, studentId: string) => {
  try {
    await prismaClient.course.update({
      where: { id },
      data: {
        userCourses: {
          create: {
            userId: studentId
          }
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to add student to course')
  }
}

export const createCourseComplete = async (createCourseComplete: CreateCourseCompleteDto) => {
  try {
    return await prismaClient.course.create({
      data: {
        name: createCourseComplete.course,
        startDate: createCourseComplete.startDate,
        endDate: createCourseComplete.endDate,
        description: createCourseComplete.description,
        thumbnail: createCourseComplete.thumbnail,
        skills: {
          connect: createCourseComplete.skillIds.map(skillId => ({ id: skillId }))
        },
        sessions: {
          create: createCourseComplete.sessions.map(session => ({
            name: session.name,
            description: session.description,
            startDate: session.startDate,
            endDate: session.endDate,
            thumbnail: session.thumbnail,
            activities: {
              create: session.activities.map(activity => ({
                activityId: activity.activityId,
                startDate: activity.startDate,
                endDate: activity.endDate
              }))
            }
          }))
        }
      }
    })
  } catch (error) {
    console.error(error)
    throw new Error('Failed to create course complete')
  }
}
