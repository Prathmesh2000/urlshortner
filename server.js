const bodyParser = require('body-parser');
const express = require('express');

const DEFAULT_TTL_TIME = 120000 //120s
const app = express();

let shortURLMap = {};
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.listen(3000,()=>{
    console.log('port is running at 3000')
})

const genrateRandomShortURL = ()=>{
    let currTime = Date.now();
    return Math.random().toString(36).slice(2) + currTime.toString().slice(0, 1)
}

app.post('/shorten', (req, res)=>{
    try{
        const {long_url=null, ttl_seconds=DEFAULT_TTL_TIME} = req.body;
        let {custom_alias=null}  = req.body;
        if(!long_url) return res.status(400).json({
            msg: 'long_url is mandatory field',
        })
        if(!custom_alias || shortURLMap[custom_alias]){
            custom_alias = genrateRandomShortURL()
        }
        shortURLMap[custom_alias] = {
            url : long_url,
            ttl: ttl_seconds,
            hitCount: 0,
            hitTime: [],
            expiretime: ttl_seconds + Date.now()
        }

        return res.status(200).json({
            "short_url": `http://127.0.0.1:3000/${custom_alias}`  
        })
    } catch(err){
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        })
    }  
})



app.get('/:id', (req, res)=>{
    try{
        const short_url = req?.params?.id;
        let urlData = shortURLMap[short_url] || null;
        let currTime = Date.now()
        if(!urlData) {
            return res.status(404).json({
                msg: 'URL not found'
            })
        }
        if(currTime>urlData.expiretime){
            return res.status(404).json({
                msg: 'URL got expired'
            })
        }
        let dateNdTime = new Date().toUTCString()
        shortURLMap[short_url].hitCount+=1;
        shortURLMap[short_url].hitTime.push(dateNdTime);
        return res.redirect(`https://${urlData.url}`)

    } catch(err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        })
    }
})

app.get(`/analytics/:id`, (req, res) => {
    try{
        const short_url = req?.params?.id;
        let data = shortURLMap[short_url];
        if(!data) {
            return res.status(404).json({
                msg: 'data not found'
            }) 
        }
        return res.status(404).json({
            "alias": short_url,
            "long_url": data.url,
            "access_count": data.hitCount,
            "access_times": data.hitTime
        })
    } catch(err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        })
    }
})

app.put('/update/:id', (req, res) => {
    try{
        const short_url = req?.params?.id;
        let currTime = Date.now()
        let {custom_alias=null}  = req.body;
        if(shortURLMap[custom_alias]){
            return res.status(400).json({
                msg: 'Alias already exist '
            }) 
        }
        if(!custom_alias){
            custom_alias = genrateRandomShortURL()
        }

        let data = shortURLMap[short_url];
        if(!data) {
            return res.status(404).json({
                msg: 'Alias does not exist '
            }) 
        }
        if(currTime>data.expiretime){
            return res.status(404).json({
                msg: 'Alias has expired'
            })
        }
        let tempObj = {...shortURLMap[short_url]}
        shortURLMap[custom_alias]={...tempObj};
        delete shortURLMap[short_url];
        return res.status(200).json({
            msg: 'Successfully updated'
        })
    } catch(err){
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        })
    }
})

app.delete('/delete/:id', (req,res)=>{
    try{
        const short_url = req?.params?.id;
        let currTime = Date.now()
        let data = shortURLMap[short_url];
        if(!data) {
            return res.status(404).json({
                msg: 'Alias does not exist '
            }) 
        }
        if(currTime>data.expiretime){
            return res.status(404).json({
                msg: 'Alias has expired'
            })
        }
        delete shortURLMap[short_url];
        return res.status(200).json({
            msg: 'Successfully deleted.'
        })
    } catch (err){
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        })
    }
})