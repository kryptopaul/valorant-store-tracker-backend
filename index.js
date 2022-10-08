const loginAndFetch = require('./loginAndFetch.js')
const express = require('express')
const cors = require('cors')

const port = 8080
const app = express();
app.use(express.json());
app.use(cors());


app.post('/getSkinsWeb', (req, res) => {
    console.log('Received a request to get skins')
    const login = req.body.login
    const password = req.body.password
    loginAndFetch(login, password).then(dailyShop => {
        console.log('Express side seems done: ' + dailyShop)
        res.send(dailyShop)
    })

  });

app.get('/', (req, res) => {
    res.send('Hello! :)')
})

app.listen(port, () => {
    console.log('Daily Store API by isu running on port: ' + port)
})

