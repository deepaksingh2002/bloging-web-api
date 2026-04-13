

class ApiError extends Error {
    // Standard error shape used by controllers and middleware.
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
