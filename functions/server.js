const bodyParser = require('body-parser');
const express = require('express');
const serverless = require('serverless-http');
const { client } = require('../db');

const DEFAULT_TTL_TIME = 12000000; // 120s
const app = express();
const router = express.Router();

app.use('/.netlify/functions/', router); // Updated this line
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

try {
    var db = client.db('shorturl');
    if(db) console.log('DB connected')
} catch (err) {
    console.error(err);
}

const genrateRandomShortURL = async () => {
    let currTime = Date.now();
    let shorturl =  Math.random().toString(36).slice(2) + currTime.toString().slice(0, 1);
    if(await shortURLData(shorturl)){
        return genrateRandomShortURL()
    } else {
        return shorturl;
    }
};

const shortURLData = async (key) => {
    try{
        const query = { [key]: { $exists: true } };
        return await db.collection('urldata').findOne(query)
    } catch (err) {
        return true;
    }
}

router.use(express.json());


router.get('/test', async(req, res) => {
    try{
        const collections = await db.listCollections().toArray();

        res.status(200).json({ db: collections, a:"fdsfds"})
    } catch (err) {
        res.status(400).json({ error:"eror", p: err.message})

    }
})

router.post('/shorten', async(req, res) => {
    try {
        const { long_url = null, ttl_seconds = DEFAULT_TTL_TIME } = req.body;
        let { custom_alias = null } = req.body;
        if (!long_url) return res.status(400).json({
            msg: 'long_url is mandatory field',
        });
        if (!custom_alias || await shortURLData(custom_alias)) {
            custom_alias = await genrateRandomShortURL();
        }
        await db.collection('urldata').insertOne({
            [custom_alias]: {
                url: long_url,
                ttl: ttl_seconds,
                shortURL: custom_alias,
                hitCount: 0,
                hitTime: [],
                expiretime: ttl_seconds + Date.now()
            }
        })

        const baseUrl = req.headers.host.includes('localhost')
            ? `http://${req.headers.host}/.netlify/functions`
            : `https://${req.headers.host}/.netlify/functions`;

        return res.status(200).json({
            "short_url": `${baseUrl}/${custom_alias}`  
        });
    } catch (err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const short_url = req.params.id;
        let urlData = await shortURLData(short_url) || {};
        urlData = urlData[short_url] || null;
        let currTime = Date.now();
        if (!urlData) {
            return res.status(404).json({
                msg: 'URL not found'
            });
        }
        if (currTime > urlData.expiretime) {
            return res.status(404).json({
                msg: 'URL got expired'
            });
        }
        let dateNdTime = new Date().toUTCString();
        
        let tempHitCount = urlData.hitCount + 1;
        let tempHitTime = [...urlData.hitTime, dateNdTime];

        const filter = { [`${short_url}.shortURL`]: `${short_url}` };
        const update = {
            $set: {
                [`${short_url}.hitCount`]: tempHitCount,
                [`${short_url}.hitTime`]: tempHitTime
            }
        };
        await db.collection('urldata').updateOne(filter, update);
        return res.redirect(`https://${urlData.url}`);
    } catch (err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        });
    }
});

router.get(`/analytics/:id`, async(req, res) => {
    try {
        const short_url = req.params.id;
        let data = await shortURLData(short_url) || {};
        data = data[short_url] || null;

        if (!data) {
            return res.status(404).json({
                msg: 'data not found'
            });
        }
        return res.status(200).json({
            "alias": short_url,
            "long_url": data.url,
            "access_count": data.hitCount,
            "access_times": data.hitTime
        });
    } catch (err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        });
    }
});

router.put('/update/:id', async(req, res) => {
    try {
        const short_url = req.params.id;
        let currTime = Date.now();
        let { custom_alias = null } = req.body;
        if (await shortURLData(custom_alias)) {
            return res.status(400).json({
                msg: 'Alias already exists '
            });
        }
        if (!custom_alias) {
            custom_alias = await genrateRandomShortURL();
        }

        let data = await shortURLData(short_url);
        data = data[short_url] || null;

        if (!data) {
            return res.status(404).json({
                msg: 'Alias does not exist '
            });
        }
        if (currTime > data.expiretime) {
            return res.status(404).json({
                msg: 'Alias has expired'
            });
        }

        await db.collection('urldata').insertOne({
            [custom_alias]: {...data, shortURL: custom_alias}
        })
        const filter = { [`${short_url}.shortURL`]: `${short_url}` };

        await db.collection('urldata').deleteOne(filter);

        return res.status(200).json({
            msg: 'Successfully updated'
        });
    } catch (err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        });
    }
});

router.delete('/delete/:id', async (req, res) => {
    try {
        const short_url = req.params.id;
        let currTime = Date.now();
        let data = await shortURLData(short_url);
        data = data[short_url] || null;

        if (!data) {
            return res.status(404).json({
                msg: 'Alias does not exist '
            });
        }
        if (currTime > data.expiretime) {
            return res.status(404).json({
                msg: 'Alias has expired'
            });
        }
        const filter = { [`${short_url}.shortURL`]: `${short_url}` };

        await db.collection('urldata').deleteOne(filter);

        return res.status(200).json({
            msg: 'Successfully deleted.'
        });
    } catch (err) {
        console.error(err.message);
        return res.status(503).json({
            msg: err.message || 'Something went wrong',
        });
    }
});

module.exports.handler = serverless(app);