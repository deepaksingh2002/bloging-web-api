import {app} from "./src/app.js";
import {config} from "./src/config/config.js";

const port = config.port || 8000;
app.listen(port, () => console.log(`Server is running on: ${port}`))