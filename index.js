import express from 'express'
import path from 'path'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import jsonwebtoken from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const app = express()
const databaseConnect = async () => {
    try {
        const connect = await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: "dataTesting" })
        if (connect) {
            console.log('database connected')
        }
    } catch (e) {
        console.error(e)
    }

}
databaseConnect();

// Data schema(format)
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
})

// Database collection(model)
const userModel = mongoose.model('user', userSchema)

// setting up engine
app.set('view engine', 'ejs')

// middleware
app.use(express.static(path.join(path.resolve(), 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())


const isAunthenticated = async (req, res, next) => {
    const { token } = req.cookies
    if (token) {
        const userToken = jsonwebtoken.verify(token, 'thisIsSecretPhrase')
        req.user = await userModel.findById(userToken._id)
        next()
    } else {
        res.render('login')
    }
}

app.get('/', isAunthenticated, (req, res) => {
    res.render('logout', { 'name': req.user.name })
})

app.get('/login', (req, res) => {
    res.render('login')
})
app.get('/signup', (req, res) => {
    res.render('signup')
})
app.get('/logout', (req, res) => {
    res.cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    })
    res.redirect('/')
})


app.post('/login', async (req, res) => {
    const { email, password } = req.body
    let user = await userModel.findOne({ email })
    if (!user) return res.render('signup')

    const isMatch = await bcrypt.compare(password , user.password)

    if (!isMatch) return res.render('login', { email, 'error': 'password incorrect' })

    const token = jsonwebtoken.sign({ _id: user._id }, 'thisIsSecretPhrase')
    res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 600 * 1000),
    })
    res.redirect('/')

})

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body

    const userExist = await userModel.findOne({ email })

    if (userExist) return res.redirect('/login')

    const hashedPassword = await bcrypt.hash(password , 10)
    await userModel.create({
        name,
        email,
        password: hashedPassword
    })

    res.redirect('/login')
})

app.listen(5000, () => {
    console.log('server connected')
})