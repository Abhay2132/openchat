const express = require("express")
const router = express.Router();

router.use((req,res, next)=>{
    const {url, method} = req;
    res.on("close",()=>{
        console.log(res.statusCode, method, url);
    })

    next();
})

module.exports = router;