// import mongoose from 'mongoose'
// import dotenv from 'dotenv'
// dotenv.config()
// try {
//     mongoose.connect(`${process.env.dbUrl}/${process.env.dbName}`)
//     console.log("mongoose connected successfully")
// } catch (error) {
//     console.log(error)
// }

// export default mongoose

import mongoose from 'mongoose'
// import dotenv from 'dotenv'
// dotenv.config()

// try {
//     mongoose.connect(process.env.MONGODB_URI) // Use MONGODB_URI instead of dbUrl/dbName
//     console.log("MongoDB connected successfully")
// } catch (error) {
//     console.log("MongoDB connection error:", error)
// }

export default mongoose