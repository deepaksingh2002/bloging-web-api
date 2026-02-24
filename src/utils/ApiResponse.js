/**
 * File: D:\Fs\Blog\backend\src\utils\ApiResponse.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

class ApiResponse {
    constructor(
        statusCode,
        data, 
        message = "Success"
    ){
        this.statusCode= statusCode,
        this.data= data,
        this.message= message,
        this.success= statusCode < 400
    }
}

export {ApiResponse}
