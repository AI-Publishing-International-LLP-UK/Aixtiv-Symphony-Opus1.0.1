'use client'
import { Fragment, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Collapse,
  IconButton,
  Box
} from '@mui/material'

import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

import tableStyles from '@core/styles/table.module.css'
import Link from '@/components/Link'
import { nameElement, url } from './contstants'
import { deleteCourse, getAllCourses } from '@/actions/course-action'
import DateComponent from '@/components/global/DateComponent'
import { deleteSession, removeActivityFromSession } from '@/actions/session-action'

export default function Page() {
  const [courses, setCourses] = useState<any[]>([])
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [openActivityId, setOpenActivityId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    getAllCourses().then(data => {
      setCourses(data)
      console.log(data)
    })
  }, [])

  const deleteCourseMethod = async (id: string) => {
    deleteCourse(id).then(() => {
      const updatedCourses = courses.filter(course => course.id !== id)

      setCourses(updatedCourses)
    })
  }

  const toggleSessionExpansion = (id: string) => {
    setOpenSessionId(openSessionId === id ? null : id)

    // Close activities when session is closed
    setOpenActivityId(null)
  }

  const toggleActivityExpansion = (id: string) => {
    setOpenActivityId(openActivityId === id ? null : id)
  }

  const handleCreateSession = (courseId: string) => {
    router.push(`/${url}/create-session/${courseId}`)
  }

  const handleCreateActivity = (sessionId: string) => {
    router.push(`/${url}/create-activity/${sessionId}`)
  }

  const updateSessionAction = (sessionId: string) => {
    router.push(`/${url}/edit-session/${sessionId}`)
  }

  const deleteSessionActivity = async (sessionActivityId: string) => {
    console.log(sessionActivityId)
    const response = await removeActivityFromSession(sessionActivityId)

    if (response) {
      const updatedCourses = courses.map(course => {
        const updatedSessions = course.sessions.map((session: { activities: any[] }) => {
          const updatedActivities = session.activities.filter(
            (activity: { id: string }) => activity.id !== sessionActivityId
          )

          return {
            ...session,
            activities: updatedActivities
          }
        })

        return {
          ...course,
          sessions: updatedSessions
        }
      })

      setCourses(updatedCourses)
    }
  }

  const deleteSessionAction = (sessionId: string) => {
    deleteSession(sessionId).then(() => {
      const updatedCourses = courses.map(course => {
        const updatedSessions = course.sessions.filter((session: any) => session.activities.id !== sessionId)

        return {
          ...course,
          sessions: updatedSessions
        }
      })

      setCourses(updatedCourses)
    })
  }

  return (
    <Card>
      <CardHeader title={nameElement} />
      <CardContent>
        <div style={{ textAlign: 'right' }} className='mb-3'>
          <Button variant='contained' onClick={() => router.push(`/${url}/create`)}>
            Create {nameElement}
          </Button>
        </div>

        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Thumbnail</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map(course => (
                <Fragment key={course.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        aria-label='expand row'
                        size='small'
                        onClick={() => toggleSessionExpansion(course.id)}
                      >
                        {openSessionId === course.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.description}</TableCell>
                    <TableCell>
                      <img src={course.thumbnail} alt={course.name} style={{ width: '50px' }} />
                    </TableCell>
                    <TableCell>
                      <DateComponent date={new Date(course.createdAt)} />
                    </TableCell>
                    <TableCell>
                      <DateComponent date={new Date(course.updatedAt)} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/${url}/edit/${course.id}`}>
                        <Button variant='contained' style={{ marginRight: '10px' }}>
                          Edit
                        </Button>
                      </Link>
                      <Button
                        onClick={() => deleteCourseMethod(course.id)}
                        variant='contained'
                        color='error'
                        style={{ marginRight: '10px' }}
                      >
                        Delete
                      </Button>
                      <Link href={`/${url}/view/${course.id}`}>
                        <Button variant='contained' color='success'>
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                      <Collapse in={openSessionId === course.id} timeout='auto' unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography
                            variant='h6'
                            gutterBottom
                            component='div'
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                          >
                            Sessions
                            <Button variant='contained' onClick={() => handleCreateSession(course.id)}>
                              Create Session
                            </Button>
                          </Typography>
                          <Table size='small' aria-label='sessions'>
                            <TableHead>
                              <TableRow>
                                <TableCell />
                                {/* <TableCell>ID</TableCell> */}
                                <TableCell>Name Session</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Thumbnail</TableCell>
                                <TableCell>Created At</TableCell>
                                <TableCell>Updated At</TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {course.sessions.map((session: any) => (
                                <Fragment key={session.id}>
                                  <TableRow>
                                    <TableCell>
                                      <IconButton
                                        aria-label='expand row'
                                        size='small'
                                        onClick={() => toggleActivityExpansion(session.id)}
                                      >
                                        {openActivityId === session.id ? (
                                          <KeyboardArrowUpIcon />
                                        ) : (
                                          <KeyboardArrowDownIcon />
                                        )}
                                      </IconButton>
                                    </TableCell>
                                    <TableCell>{session.name}</TableCell>
                                    <TableCell>{session.description}</TableCell>
                                    <TableCell>
                                      <img src={session.thumbnail} alt={session.name} style={{ width: '50px' }} />
                                    </TableCell>
                                    <TableCell>
                                      <DateComponent date={new Date(session.createdAt)} />
                                    </TableCell>
                                    <TableCell>
                                      <DateComponent date={new Date(session.updatedAt)} />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        onClick={() => updateSessionAction(session.id)}
                                        variant='contained'
                                        style={{ marginRight: '10px' }}
                                      >
                                        Edit
                                      </Button>

                                      <Button
                                        onClick={() => deleteSessionAction(session.id)}
                                        variant='contained'
                                        color='error'
                                        style={{ marginRight: '10px' }}
                                      >
                                        Delete
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                      <Collapse in={openActivityId === session.id} timeout='auto' unmountOnExit>
                                        <Box sx={{ margin: 1 }}>
                                          <Typography
                                            variant='h6'
                                            gutterBottom
                                            component='div'
                                            style={{ display: 'flex', justifyContent: 'space-between' }}
                                          >
                                            Activities
                                            <Button
                                              variant='contained'
                                              onClick={() => handleCreateActivity(session.id)}
                                            >
                                              Create Activity
                                            </Button>
                                          </Typography>
                                          <Table size='small' aria-label='activities'>
                                            <TableHead>
                                              <TableRow>
                                                {/* <TableCell>ID</TableCell> */}
                                                <TableCell>Name Activity</TableCell>
                                                <TableCell>Description</TableCell>
                                                <TableCell>Start Date</TableCell>
                                                <TableCell>End Date</TableCell>
                                                <TableCell>Created At</TableCell>
                                                <TableCell>Updated At</TableCell>
                                                <TableCell>Actions</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {session.activities.map((activity: any) => (
                                                <TableRow key={activity.id}>
                                                  <TableCell>{activity.activity.name}</TableCell>
                                                  <TableCell>{activity.activity.description}</TableCell>
                                                  <TableCell>
                                                    <DateComponent date={new Date(activity.startDate)} />
                                                  </TableCell>
                                                  <TableCell>
                                                    <DateComponent date={new Date(activity.endDate)} />
                                                  </TableCell>
                                                  <TableCell>
                                                    <DateComponent date={new Date(activity.createdAt)} />
                                                  </TableCell>
                                                  <TableCell>
                                                    <DateComponent date={new Date(activity.updatedAt)} />
                                                  </TableCell>
                                                  <TableCell>
                                                    <Link href={`/activity/edit/${activity.activityId}`}>
                                                      <Button variant='contained' style={{ marginRight: '10px' }}>
                                                        Edit
                                                      </Button>
                                                    </Link>
                                                    <Button
                                                      onClick={() => deleteSessionActivity(activity.id)}
                                                      variant='contained'
                                                      color='error'
                                                      style={{ marginRight: '10px' }}
                                                    >
                                                      Delete
                                                    </Button>
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                </Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}
