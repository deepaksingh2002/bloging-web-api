/**
 * File: D:\Fs\Blog\backend\src\utils\ApiError.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

class ApiError extends Error {
    constructor(
        statusCode,
        message= "Somthing went wrong",
        errors= [],
        stack= ""
    ){
        super(message),
        this.statusCode= statusCode,
        this.data= null,
        this.message= message,
        this.success= false,
        this.error= errors
        if(stack){
            this.stack= stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
export {ApiError}
