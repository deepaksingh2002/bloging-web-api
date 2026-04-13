
import mongoose from "mongoose";
import { DB_NAME } from "../../constants.js";

// Establishes a single MongoDB connection before the HTTP server starts.
const connectDB = async () => {
    try {
        const connectInstance = await mongoose.connect(`${process.env.MONGO_CONNECTION_STRING}/${DB_NAME}`)
        console.log(`MongoDB connected!! DB_HOST: ${connectInstance.connection.host}`);
    } catch (error) {
        console.log("Mongose connection error: ", error);
        process.exit(1);
    }
}


export default connectDB
