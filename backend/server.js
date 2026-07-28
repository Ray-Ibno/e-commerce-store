import app from './app.js'
import checkDatabaseConnection from './utils/dbCheck.js'

const PORT = process.env.PORT || 4004

app.listen(PORT, () => {
  checkDatabaseConnection()
  console.log(`running on port ${PORT}...`)
})
