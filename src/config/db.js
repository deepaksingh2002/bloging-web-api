import mongoose from "mongoose";
import {config} from "../config/config.js";
import {DB_NAME} from "../../constants.JS";

const connectDB = async() => {
    try {
        const connectInstance= await mongoose.connect(`${config.databaseUrl}/${DB_NAME}`)
        console.log(`MongoDB connected!! DB_HOST: ${connectInstance.connection.host}`);
    } catch (error) {
        console.log("Mongose connection error: ", error);
        process.exit(1);
    }
}


export default connectDB