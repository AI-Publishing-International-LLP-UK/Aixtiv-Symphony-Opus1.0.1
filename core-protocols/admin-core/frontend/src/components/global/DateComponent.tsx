import { format } from 'date-fns'

interface Props {
  date: Date
}

const DateComponent = ({ date }: Props) => {
  return <p>{format(date, 'LLL d, yyyy')}</p>
}

export default DateComponent
