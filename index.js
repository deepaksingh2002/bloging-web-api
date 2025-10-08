import {app} from "./src/app.js";
import {config} from "./src/config/config.js";
import connectDB from "./src/config/db.js";


connectDB()
.then(() =>{
    const port = config.port || 8000;
    app.listen(port, () => console.log(`Server is running on: ${port}`));
    })
.catch((error)=>{
    console.log("mongoDB connection faild !!!", error);
})