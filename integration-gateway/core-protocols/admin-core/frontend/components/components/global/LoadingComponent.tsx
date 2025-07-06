interface Props {
  children: React.ReactNode
  loading: boolean
}

const ComponentLoading = ({ children, loading }: Props) => {
  return (
    <>
      {loading ? (
        <div className='flex justify-center items-center h-screen'>
          <div className='loader'>Loading...</div>
        </div>
      ) : (
        children
      )}
    </>
  )
}

export default ComponentLoading
