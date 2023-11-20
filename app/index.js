const express = require("express");
const path = require("node:path");
const router = require("./lib/router")
const PORT = process.env.PORT || 3100;


const app = express();

app.use(router);
app.use(express.static(path.join(path.resolve(),'public')))

app.listen(PORT, ()=>{
    console.log("SERVER STARTED AT LOCALHOST:3000");
})